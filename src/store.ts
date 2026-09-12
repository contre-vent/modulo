import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Classification, Message } from './domain.js';
import type { Period, ReportScope, Statistic } from './reports.js';

export interface ChannelRow { id: string; name: string; activated_at: string; eligible: number }
export interface MessageRow {
  channel_id: string; ts: string; user_id: string; thread_ts: string | null; text: string | null;
  status: 'pending' | 'analyzed' | 'failed'; attempts: number; next_at: number; result: string | null;
}
export interface OutboxRow { id: string; channel_id: string; kind: 'reaction' | 'post'; payload: string; attempts: number }
export interface Delivery { id: string; channelId: string; kind: 'reaction' | 'post'; payload: Record<string, unknown> }

export class Store {
  readonly db: DatabaseSync;
  constructor(path: string, teamId: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, name TEXT NOT NULL, activated_at TEXT NOT NULL, eligible INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS messages (
        channel_id TEXT NOT NULL, ts TEXT NOT NULL, user_id TEXT NOT NULL, thread_ts TEXT, text TEXT,
        status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL DEFAULT 0,
        result TEXT, model TEXT, version TEXT, PRIMARY KEY(channel_id, ts));
      CREATE INDEX IF NOT EXISTS messages_pending ON messages(status, next_at);
      CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL, last_error TEXT);
      CREATE TABLE IF NOT EXISTS monthly_reports (month TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
    `);
    const previous = this.meta('team_id');
    if (previous && previous !== teamId) throw new Error('Database belongs to another Slack workspace');
    this.setMeta('team_id', teamId);
    // A crash during a post leaves uncertain delivery; never blindly duplicate it.
    this.db.exec("UPDATE outbox SET state='uncertain', last_error='interrupted_delivery' WHERE state='sending' AND kind='post'; UPDATE outbox SET state='pending' WHERE state='sending' AND kind='reaction';");
  }
  close() { this.db.close(); }
  meta(key: string) { return (this.db.prepare('SELECT value FROM meta WHERE key=?').get(key) as { value: string } | undefined)?.value; }
  setMeta(key: string, value: string) { this.db.prepare('INSERT OR REPLACE INTO meta VALUES (?,?)').run(key, value); }
  channel(id: string) { return this.db.prepare('SELECT * FROM channels WHERE id=?').get(id) as ChannelRow | undefined; }
  channels() { return this.db.prepare('SELECT * FROM channels ORDER BY id').all() as unknown as ChannelRow[]; }
  upsertChannel(id: string, name: string, eligible: boolean, now = Date.now()) {
    const activated = (now / 1000).toFixed(6);
    this.db.prepare(`INSERT INTO channels VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, eligible=excluded.eligible`).run(id, name, activated, Number(eligible));
    if (!this.meta('started_at')) this.setMeta('started_at', activated);
  }
  disableChannel(id: string) { this.db.prepare('UPDATE channels SET eligible=0 WHERE id=?').run(id); }
  accept(message: Message) {
    const c = this.channel(message.channelId);
    if (!c?.eligible || message.ts < c.activated_at) return false;
    return this.db.prepare('INSERT OR IGNORE INTO messages(channel_id,ts,user_id,thread_ts,text) VALUES (?,?,?,?,?)')
      .run(message.channelId, message.ts, message.userId, message.threadTs, message.text).changes > 0;
  }
  pending(now = Date.now()) {
    return this.db.prepare(`SELECT m.* FROM messages m JOIN channels c ON c.id=m.channel_id
      WHERE m.status='pending' AND m.next_at<=? AND c.eligible=1 ORDER BY m.ts LIMIT 1`).get(now) as MessageRow | undefined;
  }
  context(message: Message): Message[] {
    const rows = this.db.prepare(`SELECT * FROM messages WHERE channel_id=? AND ts<? AND text IS NOT NULL
      AND (? IS NULL OR thread_ts=? OR ts=?) ORDER BY ts DESC LIMIT 10`)
      .all(message.channelId, message.ts, message.threadTs, message.threadTs, message.threadTs) as unknown as MessageRow[];
    return rows.reverse().map(rowMessage);
  }
  classified(message: Message, result: Classification, model: string, version: string, deliveries: Delivery[]) {
    this.transaction(() => {
      this.db.prepare("UPDATE messages SET status='analyzed',result=?,model=?,version=? WHERE channel_id=? AND ts=?")
        .run(JSON.stringify(result), model, version, message.channelId, message.ts);
      for (const delivery of deliveries) this.enqueue(delivery);
    });
  }
  failed(message: MessageRow, now = Date.now()) {
    const attempts = message.attempts + 1;
    this.db.prepare('UPDATE messages SET attempts=?,status=?,next_at=? WHERE channel_id=? AND ts=?')
      .run(attempts, attempts >= 5 ? 'failed' : 'pending', now + Math.min(300_000, 5000 * 2 ** attempts), message.channel_id, message.ts);
  }
  enqueue(delivery: Delivery) {
    this.db.prepare('INSERT OR IGNORE INTO outbox(id,channel_id,kind,payload,created_at) VALUES (?,?,?,?,?)')
      .run(delivery.id, delivery.channelId, delivery.kind, JSON.stringify(delivery.payload), Date.now());
  }
  nextDelivery(now = Date.now()) {
    return this.db.prepare("SELECT o.* FROM outbox o JOIN channels c ON c.id=o.channel_id WHERE o.state='pending' AND o.next_at<=? AND c.eligible=1 ORDER BY o.created_at,o.rowid LIMIT 1").get(now) as OutboxRow | undefined;
  }
  sending(id: string) { this.db.prepare("UPDATE outbox SET state='sending' WHERE id=?").run(id); }
  sent(id: string) { this.db.prepare("UPDATE outbox SET state='sent',last_error=NULL WHERE id=?").run(id); }
  deliveryFailed(row: OutboxRow, code: string, retry: boolean, delay = 30_000) {
    const attempts = row.attempts + 1;
    this.db.prepare('UPDATE outbox SET state=?,attempts=?,next_at=?,last_error=? WHERE id=?')
      .run(retry && attempts < 5 ? 'pending' : 'uncertain', attempts, Date.now() + delay, code, row.id);
  }
  createMonthly(month: string, deliveries: Delivery[]) {
    if (this.db.prepare('SELECT month FROM monthly_reports WHERE month=?').get(month)) return false;
    this.transaction(() => {
      this.db.prepare('INSERT INTO monthly_reports VALUES (?,?)').run(month, Date.now());
      for (const delivery of deliveries) this.enqueue(delivery);
    });
    return true;
  }
  statistics(scope: ReportScope, period: Period): Statistic[] {
    const user = scope.kind === 'user' || scope.kind === 'users';
    const single = 'id' in scope;
    const column = user ? 'm.user_id' : 'm.channel_id';
    const rows = this.db.prepare(`SELECT ${column} AS id,
      SUM(CASE WHEN json_extract(m.result,'$.verdict')='positive' THEN 1 ELSE 0 END) AS positive,
      SUM(CASE WHEN json_extract(m.result,'$.verdict')='negative' THEN 1 ELSE 0 END) AS negative,
      SUM(CASE WHEN json_extract(m.result,'$.verdict')='neutral' THEN 1 ELSE 0 END) AS neutral,
      SUM(CASE WHEN json_extract(m.result,'$.verdict')='indeterminate' THEN 1 ELSE 0 END) AS indeterminate,
      SUM(CASE WHEN m.status='pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN m.status='failed' THEN 1 ELSE 0 END) AS failed
      FROM messages m JOIN channels c ON c.id=m.channel_id
      WHERE c.eligible=1 AND CAST(m.ts AS REAL)>=? AND CAST(m.ts AS REAL)<? ${single ? `AND ${column}=?` : ''}
      GROUP BY ${column}`).all(...(single ? [period.from, period.to, scope.id] : [period.from, period.to])) as unknown as Statistic[];
    if (!user) {
      for (const c of this.channels().filter(c => c.eligible && Number(c.activated_at) < period.to && (!single || c.id === scope.id))) {
        if (!rows.some(r => r.id === c.id)) rows.push({ id: c.id, positive: 0, negative: 0, neutral: 0, indeterminate: 0, pending: 0, failed: 0 });
      }
    }
    return rows;
  }
  purge(now = Date.now()) {
    const cutoff = now / 1000 - 30 * 86400;
    this.db.prepare(`UPDATE messages SET text=NULL, result=CASE WHEN result IS NULL THEN NULL ELSE json_set(result,'$.explanation','','$.suggestion','') END,
      status=CASE WHEN status='pending' THEN 'failed' ELSE status END WHERE CAST(ts AS REAL)<?`).run(cutoff);
    this.db.prepare("DELETE FROM outbox WHERE created_at<? AND state IN ('sent','uncertain')").run(cutoff * 1000);
    this.db.prepare("UPDATE outbox SET payload='{}',state='uncertain',last_error='retention_expired' WHERE created_at<? AND state IN ('pending','sending')").run(cutoff * 1000);
  }
  diagnostics() {
    return { messages: this.db.prepare('SELECT status,COUNT(*) AS count FROM messages GROUP BY status').all(),
      deliveries: this.db.prepare('SELECT state,COUNT(*) AS count FROM outbox GROUP BY state').all() };
  }
  private transaction(fn: () => void) {
    this.db.exec('BEGIN IMMEDIATE');
    try { fn(); this.db.exec('COMMIT'); } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
}
export function rowMessage(row: MessageRow): Message {
  return { channelId: row.channel_id, userId: row.user_id, ts: row.ts, threadTs: row.thread_ts, text: row.text ?? '' };
}
