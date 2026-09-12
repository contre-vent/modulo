import { App, LogLevel } from '@slack/bolt';
import { readConfig } from './config.js';
import { Store } from './store.js';
import { OpenAIClassifier } from './classifier.js';
import { SlackAPI, errorCode } from './slack.js';
import { Engine } from './engine.js';
import { educationServer } from './education.js';
import { acquireProcessLock } from './process-lock.js';

async function main() {
  const config = readConfig();
  const release = acquireProcessLock(config.DATABASE_PATH);
  process.once('exit', release);
  const log = (event: string, details?: object) => console.log(JSON.stringify({ event, ...details }));
  const app = new App({ token: config.SLACK_BOT_TOKEN, appToken: config.SLACK_APP_TOKEN, socketMode: true,
    logLevel: LogLevel.ERROR, clientOptions: { retryConfig: { retries: 0 }, rejectRateLimitedCalls: true } });
  const auth = await app.client.auth.test();
  if (auth.team_id !== config.SLACK_TEAM_ID || !auth.user_id) throw new Error('Le jeton Slack ne correspond pas à l’espace configuré.');
  const store = new Store(config.DATABASE_PATH, config.SLACK_TEAM_ID);
  const engine = new Engine(store, new SlackAPI(app.client),
    new OpenAIClassifier(config.OPENAI_MODEL, config.OPENAI_API_KEY, config.OPENAI_REASONING_EFFORT), {
      teamId: config.SLACK_TEAM_ID, botUserId: auth.user_id, model: config.OPENAI_MODEL,
      educationBaseUrl: config.EDUCATION_BASE_URL, timezoneUserId: config.SLACK_TIMEZONE_USER_ID, timezone: config.REPORT_TIMEZONE,
    }, log);
  app.event('message', async ({ event, body }) => { engine.ingest(body.team_id ?? '', event, Boolean('is_ext_shared_channel' in body && body.is_ext_shared_channel)); });
  app.command('/modulo', async ({ ack, command, respond }) => {
    await ack();
    try {
      await engine.requestReport(command.team_id, command.user_id, command.channel_id, command.text, command.trigger_id);
      await respond({ text: 'The report will be posted in this channel.', response_type: 'ephemeral' });
    } catch (e) {
      // Only expose our own user-facing validation errors, never upstream API errors.
      const message = e instanceof Error && !('code' in e) && !('data' in e) ? e.message : 'Unable to generate this report right now.';
      await respond({ text: message, response_type: 'ephemeral' });
    }
  });
  for (const name of ['channel_created', 'channel_archive', 'channel_unarchive', 'channel_rename', 'channel_shared', 'channel_unshared', 'member_left_channel'] as const) {
    app.event(name, async () => { await engine.syncChannels(); });
  }
  app.error(async error => log('slack_error', { code: errorCode(error) }));
  // Endpoint exposes generic education only. Statistics always travel through Slack.
  const server = educationServer();
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(config.PORT, '127.0.0.1', resolve); });
  await engine.refreshTimezone();
  store.purge();
  await app.start();
  await engine.syncChannels();
  let maintenanceBusy = false;
  const maintenance = async () => {
    if (maintenanceBusy) return;
    maintenanceBusy = true;
    try { await engine.syncChannels(); await engine.refreshTimezone(); store.purge(); await engine.scheduleMonthly(); }
    catch (e) { log('maintenance_failed', { code: errorCode(e) }); }
    finally { maintenanceBusy = false; }
  };
  const worker = setInterval(() => { void engine.tick().catch(e => log('worker_failed', { code: errorCode(e) })); }, 1500);
  const timer = setInterval(() => { void maintenance(); }, 60_000);
  log('modulo_started', { team: auth.team_id, channels: store.channels().filter(c => c.eligible).length, timezone: engine.timezone, model: config.OPENAI_MODEL });
  await maintenance();
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
    clearInterval(worker); clearInterval(timer);
    void app.stop().finally(() => { server.close(); process.exit(0); });
  });
}
main().catch(error => { console.error(error instanceof Error && error.message.startsWith('Configuration incomplète') ? error.message : `Démarrage impossible (${errorCode(error)}). Vérifier la configuration locale.`); process.exit(1); });
