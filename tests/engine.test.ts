import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatPostMessageArguments } from '@slack/web-api';
import { Store } from '../src/store.js';
import { Engine } from '../src/engine.js';
import type { SlackPort, SlackUser } from '../src/slack.js';
import type { PublicChannel } from '../src/events.js';
import type { Classification } from '../src/domain.js';
import { monthPeriod } from '../src/reports.js';

class FakeSlack implements SlackPort {
  channels: PublicChannel[] = [{ id: 'C123', name: 'general', is_member: true }];
  posts: { text?: string; thread_ts?: string; blocks?: { type: string }[] }[] = [];
  reactions: string[] = [];
  failPost = false;
  async listChannels() { return this.channels; }
  async channel(id: string) { const c = this.channels.find(c => c.id === id); if (!c) throw { code: 'channel_not_found' }; return c; }
  async join(id: string) { (await this.channel(id)).is_member = true; }
  async user(id: string): Promise<SlackUser> { return { id, teamId: id === 'UOUT' ? 'T999' : 'T123', timezone: 'Europe/Paris', bot: false, deleted: false, stranger: false }; }
  async reaction(_channel: string, _ts: string, name: string) { this.reactions.push(name); }
  async post(payload: ChatPostMessageArguments) { if (this.failPost) throw { code: 'ECONNRESET' }; this.posts.push(payload as typeof this.posts[number]); }
}
const positive: Classification = { verdict: 'positive', categories: ['thanks'], language: 'fr', explanation: 'Reconnaissance', suggestion: '' };
const negative: Classification = { verdict: 'negative', categories: ['sexualized_comment'], language: 'fr', explanation: 'Ce compliment sexualise la relation.', suggestion: 'Valorise une contribution concrète.' };
function setup(result = positive) {
  const store = new Store(':memory:', 'T123');
  store.upsertChannel('C123', 'general', true, 1789230000 * 1000);
  store.setMeta('general_id', 'C123');
  const slack = new FakeSlack();
  let calls = 0;
  const engine = new Engine(store, slack, { async classify() { calls++; return result; } }, {
    teamId: 'T123', botUserId: 'UBOT', model: 'test', educationBaseUrl: 'https://education.example', timezoneUserId: 'U123',
  });
  return { store, slack, engine, calls: () => calls };
}
const event = { type: 'message', channel: 'C123', user: 'U123', ts: '1789230000.000001', text: 'Merci' };
test('End-to-end UI-01, TECH-01: one classification and reaction for a duplicated event', async () => {
  const { store, slack, engine, calls } = setup();
  try {
    assert.equal(engine.ingest('T123', event), true); assert.equal(engine.ingest('T123', event), false);
    assert.equal(engine.ingest('T999', { ...event, ts: '1789230000.000002' }), false);
    assert.equal(engine.ingest('T123', { ...event, ts: '1789230000.000002' }, true), false);
    await engine.tick(); await engine.tick();
    assert.equal(calls(), 1); assert.deepEqual(slack.reactions, ['heart']); assert.equal(slack.posts.length, 0);
    assert.equal(store.statistics({ kind: 'user', id: 'U123' }, monthPeriod('2026-09', 'UTC'))[0]?.positive, 1);
  } finally { store.close(); }
});
test('UI-02/03/04: orange reaction, threaded explanation, static lesson URL and safe model text', async () => {
  const { store, slack, engine } = setup({ ...negative, explanation: '<!channel> Ce compliment sexualise la relation.' });
  try {
    engine.ingest('T123', { ...event, thread_ts: '1789230000.000000' });
    await engine.tick(); await engine.tick();
    assert.deepEqual(slack.reactions, ['large_orange_circle']);
    assert.equal(slack.posts[0]?.thread_ts, '1789230000.000000');
    assert.ok(JSON.stringify(slack.posts[0]?.blocks).includes('/education/fr/sexualized_comment'));
    assert.ok(slack.posts[0]?.text?.includes('&lt;!channel&gt;'));
    assert.equal(slack.posts[0]?.blocks?.[0]?.type, 'section');
  } finally { store.close(); }
});
test('SCOPE-05: suspend a channel made private before processing', async () => {
  const { store, slack, engine, calls } = setup();
  try {
    engine.ingest('T123', event); slack.channels[0]!.is_private = true;
    await engine.tick(); assert.equal(calls(), 0); assert.equal(store.channel('C123')?.eligible, 0);
  } finally { store.close(); }
});
test('ACCESS-01/02: any local member may request another user; outsiders and private destinations are rejected', async () => {
  const { store, slack, engine } = setup();
  try {
    engine.ingest('T123', event); await engine.tick();
    await engine.requestReport('T123', 'UOTHER', 'C123', 'utilisateur <@U123> 2026-09');
    await engine.tick(); assert.ok(slack.posts.some(p => p.text?.includes('<@U123>')));
    await assert.rejects(engine.requestReport('T123', 'UOUT', 'C123', 'canaux'));
    await assert.rejects(engine.requestReport('T999', 'U123', 'C123', 'canaux'));
    await assert.rejects(engine.requestReport('T123', 'U123', 'D123', 'canaux'));
  } finally { store.close(); }
});
test('REPORT-01/02: Slack account timezone, monthly report includes both populations exactly once', async () => {
  const { store, slack, engine } = setup();
  try {
    await engine.refreshTimezone(); assert.equal(engine.timezone, 'Europe/Paris');
    engine.ingest('T123', event); await engine.tick();
    const now = Date.parse('2026-10-01T08:00:00Z');
    assert.equal(await engine.scheduleMonthly(now), true); assert.equal(await engine.scheduleMonthly(now), false);
    await engine.tick(); await engine.tick();
    assert.equal(slack.posts.length, 2);
    assert.ok(slack.posts.some(p => p.text?.includes('Utilisateurs')));
    assert.ok(slack.posts.some(p => p.text?.includes('Canaux')));
  } finally { store.close(); }
});
test('TECH-06: ambiguous post failure is recorded and not duplicated', async () => {
  const { store, slack, engine } = setup(negative);
  try {
    engine.ingest('T123', event); await engine.tick(); slack.failPost = true;
    await engine.tick(); slack.failPost = false; await engine.tick();
    assert.equal(slack.posts.length, 0);
    assert.ok(store.diagnostics().deliveries.some(r => r.state === 'uncertain'));
  } finally { store.close(); }
});
