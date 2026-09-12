import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/store.js';
import { monthPeriod } from '../src/reports.js';
import type { Message, Classification } from '../src/domain.js';

const message: Message = { channelId: 'C123', userId: 'U123', ts: '1789230000.000001', threadTs: null, text: 'Merci' };
const positive: Classification = { verdict: 'positive', categories: ['thanks'], language: 'fr', explanation: 'Merci', suggestion: '' };
test('SCOPE-04, TECH-01/06: activation, deduplication and classification survive restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'modulo-test-'));
  const path = join(dir, 'test.sqlite');
  let store = new Store(path, 'T123');
  try {
    store.upsertChannel('C123', 'general', true, 1789230000 * 1000);
    assert.equal(store.accept({ ...message, ts: '1789229999.999999' }), false);
    assert.equal(store.accept(message), true);
    assert.equal(store.accept(message), false);
    store.classified(message, positive, 'test', 'v1', []);
    store.close(); store = new Store(path, 'T123');
    store.upsertChannel('C123', 'renamed', true, 1789240000 * 1000);
    assert.equal(store.channel('C123')?.activated_at, '1789230000.000000');
    assert.equal(store.accept(message), false);
    assert.equal(store.statistics({ kind: 'users' }, monthPeriod('2026-09', 'UTC'))[0]?.positive, 1);
    assert.equal(store.pending(), undefined);
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});
test('CLASS-02: context contains only earlier observed messages, limited to ten and same thread', () => {
  const s = new Store(':memory:', 'T123');
  try {
    s.upsertChannel('C123', 'general', true, 1789230000 * 1000);
    for (let i = 1; i <= 15; i++) s.accept({ ...message, ts: `1789230000.${String(i).padStart(6, '0')}`, threadTs: message.ts });
    s.accept({ ...message, ts: '1789230000.000016', threadTs: '1789230000.000002' });
    const context = s.context({ ...message, ts: '1789230000.000015', threadTs: message.ts });
    assert.equal(context.length, 10);
    assert.ok(context.every(m => m.ts < '1789230000.000015' && m.threadTs === message.ts));
    assert.ok(!context.some(m => m.ts === '1789230000.000016'));
  } finally { s.close(); }
});
test('STAT-01: indeterminate, failed and pending are distinguishable; private channels disappear from reports', () => {
  const s = new Store(':memory:', 'T123');
  try {
    s.upsertChannel('C123', 'general', true, 1789230000 * 1000);
    s.accept(message);
    s.classified(message, { ...positive, verdict: 'indeterminate', categories: [] }, 'test', 'v1', []);
    s.accept({ ...message, ts: '1789230000.000002' });
    const r = s.statistics({ kind: 'users' }, monthPeriod('2026-09', 'UTC'))[0]!;
    assert.equal(r.indeterminate, 1); assert.equal(r.pending, 1); assert.equal(r.neutral, 0);
    s.disableChannel('C123');
    assert.deepEqual(s.statistics({ kind: 'users' }, monthPeriod('2026-09', 'UTC')), []);
  } finally { s.close(); }
});
test('OPEN-06 confirmed: 30-day purge removes source and generated text while retaining aggregates', () => {
  const s = new Store(':memory:', 'T123');
  try {
    s.upsertChannel('C123', 'general', true, 1789230000 * 1000);
    s.accept(message); s.classified(message, positive, 'test', 'v1', []);
    s.purge((1789230000 + 31 * 86400) * 1000);
    const raw = s.db.prepare('SELECT text,result FROM messages').get() as { text: null; result: string };
    assert.equal(raw.text, null); assert.equal(JSON.parse(raw.result).explanation, '');
    assert.equal(s.statistics({ kind: 'users' }, monthPeriod('2026-09', 'UTC'))[0]?.positive, 1);
  } finally { s.close(); }
});
test('TECH-06: monthly jobs are idempotent and uncertain posts are not blindly retried after restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'modulo-test-'));
  const path = join(dir, 'test.sqlite');
  let s = new Store(path, 'T123');
  try {
    s.upsertChannel('C123', 'general', true, 1789230000 * 1000);
    const delivery = { id: 'monthly:test', channelId: 'C123', kind: 'post' as const, payload: { text: 'report' } };
    assert.equal(s.createMonthly('2026-09', [delivery]), true);
    assert.equal(s.createMonthly('2026-09', [delivery]), false);
    s.sending(delivery.id); s.close(); s = new Store(path, 'T123');
    assert.equal(s.nextDelivery(), undefined);
    assert.equal((s.diagnostics().deliveries[0] as { state: string }).state, 'uncertain');
  } finally { s.close(); rmSync(dir, { recursive: true }); }
});
