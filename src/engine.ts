import { randomUUID, createHash } from 'node:crypto';
import type { ChatPostMessageArguments } from '@slack/web-api';
import type { Classification, Message, NegativeCategory } from './domain.js';
import { type Classifier, classifierVersion } from './classifier.js';
import { eligibleChannel, normalizeMessage } from './events.js';
import { type SlackPort, errorCode } from './slack.js';
import { Store, rowMessage, type Delivery } from './store.js';
import { lessons } from './education.js';
import { monthPeriod, dueMonthlyPeriod, parseReportCommand, reportPages, validZone, type ReportScope, type Period } from './reports.js';

export interface EngineOptions { teamId: string; botUserId: string; model: string; educationBaseUrl: string; timezoneUserId: string; timezone?: string }
export function escapeSlack(text: string) { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
export function stableUUID(key: string) {
  const h = createHash('sha256').update(key).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export class Engine {
  timezone = 'America/Toronto';
  private working = false;
  private syncing: Promise<void> | undefined;
  constructor(readonly store: Store, readonly slack: SlackPort, readonly classifier: Classifier, readonly options: EngineOptions,
    private readonly log: (event: string, details?: object) => void = () => {}) {}

  async syncChannels() {
    if (this.syncing) return this.syncing;
    this.syncing = this.discoverChannels();
    try { await this.syncing; } finally { this.syncing = undefined; }
  }
  private async discoverChannels() {
    const channels = await this.slack.listChannels();
    const seen = new Set(channels.map(c => c.id));
    for (const existing of this.store.channels()) if (!seen.has(existing.id)) this.store.disableChannel(existing.id);
    for (const channel of channels) {
      if (!eligibleChannel(channel)) { this.store.disableChannel(channel.id); continue; }
      try {
        if (!channel.is_member) await this.slack.join(channel.id);
        this.store.upsertChannel(channel.id, channel.name, true);
        if (channel.is_general || channel.name === 'general') this.store.setMeta('general_id', channel.id);
      } catch (e) { this.store.disableChannel(channel.id); this.log('channel_unavailable', { channel: channel.id, code: errorCode(e) }); }
    }
  }
  async refreshTimezone() {
    if (this.options.timezone) { this.timezone = validZone(this.options.timezone); return; }
    try { this.timezone = validZone((await this.slack.user(this.options.timezoneUserId)).timezone); }
    catch { this.timezone = 'America/Toronto'; }
  }
  /** Fast listener: persist before returning; classification happens in the worker. */
  ingest(teamId: string, event: unknown, externallyShared = false) {
    if (teamId !== this.options.teamId || externallyShared) return false;
    const message = normalizeMessage(event, this.options.botUserId);
    return message ? this.store.accept(message) : false;
  }
  async accessible(channelId: string) {
    try {
      const channel = await this.slack.channel(channelId);
      if (!eligibleChannel(channel) || !channel.is_member) { this.store.disableChannel(channelId); return false; }
      return true;
    } catch (e) {
      if (['channel_not_found', 'not_in_channel', 'is_archived'].includes(errorCode(e))) this.store.disableChannel(channelId);
      return false;
    }
  }
  async tick() {
    if (this.working) return;
    this.working = true;
    try {
      const row = this.store.pending();
      if (row && await this.accessible(row.channel_id)) {
        const message = rowMessage(row);
        try {
          const result = await this.classifier.classify(message, this.store.context(message));
          this.store.classified(message, result, this.options.model, classifierVersion, this.annotation(message, result));
        } catch (e) { this.store.failed(row); this.log('classification_failed', { code: errorCode(e) }); }
      }
      const delivery = this.store.nextDelivery();
      if (delivery && await this.accessible(delivery.channel_id)) {
        this.store.sending(delivery.id);
        try {
          if (delivery.kind === 'reaction') {
            const p = JSON.parse(delivery.payload) as { channel: string; timestamp: string; name: string };
            await this.slack.reaction(p.channel, p.timestamp, p.name);
          } else await this.slack.post(JSON.parse(delivery.payload) as ChatPostMessageArguments);
          this.store.sent(delivery.id);
        } catch (e) {
          const code = errorCode(e);
          if (delivery.kind === 'reaction' && code === 'already_reacted') this.store.sent(delivery.id);
          else {
            // Rate limiting is a definite non-delivery; network errors on posts are ambiguous.
            const retry = code === 'slack_webapi_rate_limited_error' || code === 'ratelimited' || delivery.kind === 'reaction';
            this.store.deliveryFailed(delivery, code, retry, 60_000);
            this.log('delivery_failed', { id: delivery.id, code, retry });
          }
        }
      }
    } finally { this.working = false; }
  }
  annotation(message: Message, result: Classification): Delivery[] {
    if (result.verdict === 'neutral' || result.verdict === 'indeterminate') return [];
    const key = `${message.channelId}:${message.ts}`;
    const deliveries: Delivery[] = [{ id: `${key}:reaction`, channelId: message.channelId, kind: 'reaction',
      payload: { channel: message.channelId, timestamp: message.ts, name: result.verdict === 'positive' ? 'heart' : 'large_orange_circle' } }];
    if (result.verdict === 'negative') {
      const language = result.language;
      const category = result.categories[0] as NegativeCategory;
      const lesson = lessons[category][language];
      const url = `${this.options.educationBaseUrl.replace(/\/$/, '')}/education/${language}/${category}`;
      const title = language === 'fr' ? 'Modulo · Repère de communication' : 'Modulo · Communication note';
      const suggestion = language === 'fr' ? 'Reformulation possible' : 'Possible rephrasing';
      const source = `https://app.slack.com/archives/${message.channelId}/p${message.ts.replace('.', '')}`;
      deliveries.push({ id: `${key}:explanation`, channelId: message.channelId, kind: 'post', payload: {
        channel: message.channelId, thread_ts: message.threadTs ?? message.ts, client_msg_id: stableUUID(`${key}:explanation`),
        text: `${title} — ${escapeSlack(result.explanation)} ${suggestion} : ${escapeSlack(result.suggestion)}`,
        parse: 'none', unfurl_links: false, unfurl_media: false,
        blocks: [
          { type: 'section', text: { type: 'plain_text', text: `${title}\n${lesson.title}\n${result.explanation}`, emoji: true } },
          { type: 'section', text: { type: 'plain_text', text: `${suggestion}\n${result.suggestion}`, emoji: true } },
          { type: 'section', text: { type: 'mrkdwn', text: `<${url}|${language === 'fr' ? 'Comprendre la règle et prévenir ce type de formulation' : 'Understand the guideline and prevent this wording'}> · <${source}|${language === 'fr' ? 'Message concerné' : 'Original message'}>` } },
        ],
      } });
    }
    return deliveries;
  }
  coverage() {
    const channels = this.store.channels();
    const starts = channels.filter(c => c.eligible).map(c => Number(c.activated_at));
    const start = starts.length ? new Date(Math.min(...starts) * 1000).toISOString().slice(0, 10) : '—';
    return `Observation depuis le ${start} (activation propre à chaque canal) · ${starts.length} canaux suivis · ${channels.filter(c => !c.eligible).length} suspendus · fuseau ${this.timezone}.`;
  }
  reportDeliveries(scope: ReportScope, period: Period, destination: string, key: string) {
    return reportPages(this.store.statistics(scope, period), scope, period, this.coverage()).map((text, i): Delivery => ({
      id: `${key}:${scope.kind}:${i}`, channelId: destination, kind: 'post', payload: {
        channel: destination, text, client_msg_id: stableUUID(`${key}:${scope.kind}:${i}`), parse: 'none', unfurl_links: false, unfurl_media: false,
      },
    }));
  }
  async requestReport(teamId: string, userId: string, destination: string, text: string, requestId: string = randomUUID()) {
    if (teamId !== this.options.teamId) throw new Error('Espace Slack non autorisé.');
    const user = await this.slack.user(userId);
    if (user.teamId !== teamId || user.bot || user.deleted || user.stranger) throw new Error('Membre Slack non autorisé.');
    // Reports are public in a monitored public channel; DMs/private channels are not destinations.
    if (!this.store.channel(destination)?.eligible || !await this.accessible(destination)) throw new Error('Utiliser /modulo dans un canal public suivi.');
    const { scope, month } = parseReportCommand(text);
    const period = monthPeriod(month, this.timezone);
    if (period.from > Date.now() / 1000) throw new Error('Choisir le mois courant ou un mois passé.');
    // Recheck directory before a report to exclude channels whose visibility changed.
    await this.syncChannels();
    if (scope.kind === 'channel' && !this.store.channel(scope.id)?.eligible) throw new Error('Ce canal n’est pas suivi.');
    if (scope.kind === 'user') {
      const target = await this.slack.user(scope.id);
      if (target.teamId !== teamId || target.bot || target.stranger) throw new Error('Cet utilisateur ne fait pas partie du périmètre.');
    }
    const key = `requested:${stableUUID(requestId)}`;
    for (const delivery of this.reportDeliveries(scope, period, destination, key)) this.store.enqueue(delivery);
  }
  async scheduleMonthly(now = Date.now()) {
    const period = dueMonthlyPeriod(this.timezone, now);
    const started = Number(this.store.meta('started_at'));
    if (!period || !started || started >= period.to) return false;
    const general = this.store.meta('general_id');
    if (!general || !this.store.channel(general)?.eligible || !await this.accessible(general)) return false;
    return this.store.createMonthly(period.key, [
      ...this.reportDeliveries({ kind: 'channels' }, period, general, `monthly:${period.key}`),
      ...this.reportDeliveries({ kind: 'users' }, period, general, `monthly:${period.key}`),
    ]);
  }
}
