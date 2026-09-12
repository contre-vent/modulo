import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthPeriod, dueMonthlyPeriod, parseReportCommand, rankStatistics, reportPages, validZone } from '../src/reports.js';
const row = (id: string, positive: number, negative = 0, neutral = 0) => ({ id, positive, negative, neutral, indeterminate: 0, pending: 0, failed: 0 });
test('REPORT-01: calendar boundaries respect Montreal DST and 09:00 release', () => {
  const march = monthPeriod('2026-03', 'America/Toronto');
  assert.equal(new Date(march.from * 1000).toISOString(), '2026-03-01T05:00:00.000Z');
  assert.equal(new Date(march.to * 1000).toISOString(), '2026-04-01T04:00:00.000Z');
  assert.equal(dueMonthlyPeriod('America/Toronto', Date.parse('2026-04-01T12:59:00Z')), null);
  assert.equal(dueMonthlyPeriod('America/Toronto', Date.parse('2026-04-01T13:00:00Z'))?.key, '2026-03');
  assert.equal(validZone('invalid'), 'America/Toronto');
  assert.throws(() => monthPeriod('2026-13', 'UTC'));
});
test('REPORT-05: four scopes and validation of mentions/months', () => {
  assert.deepEqual(parseReportCommand('canaux'), { scope: { kind: 'channels' }, month: undefined });
  assert.equal(parseReportCommand('utilisateurs 2026-09').scope.kind, 'users');
  assert.deepEqual(parseReportCommand('canal <#C123|general> 2026-09'), { scope: { kind: 'channel', id: 'C123' }, month: '2026-09' });
  assert.deepEqual(parseReportCommand('utilisateur <@U123>'), { scope: { kind: 'user', id: 'U123' }, month: undefined });
  assert.throws(() => parseReportCommand('canal <#D123>'));
  assert.throws(() => parseReportCommand('canaux 2026-13'));
});
test('REPORT-03/04: 20-message threshold, volume then stable ID for ties', () => {
  const rows = [row('U3', 1), row('U2', 20), row('U1', 20), row('U4', 30)];
  assert.deepEqual(rankStatistics(rows).map(r => r.id), ['U4', 'U1', 'U2', 'U3']);
  const text = reportPages(rows, { kind: 'users' }, monthPeriod('2026-09', 'UTC'), 'Depuis activation').join('');
  assert.ok(text.includes('🥇 <@U4>'));
  assert.ok(text.includes('🥈 <@U1>'));
  assert.ok(text.includes('🥉 <@U2>'));
  assert.ok(!text.includes('🥇 <@U3>'));
  assert.ok(text.includes('<@U3>'));
});
test('REPORT-02: pagination preserves all users and single reports do not award medals', () => {
  const rows = Array.from({ length: 80 }, (_, i) => row(`U${i}`, 20));
  const pages = reportPages(rows, { kind: 'users' }, monthPeriod('2026-09', 'UTC'), 'Couverture');
  assert.ok(pages.length > 1);
  assert.ok(pages.every(p => p.length < 4000));
  for (const r of rows) assert.ok(pages.some(p => p.includes(`<@${r.id}>`)));
  assert.ok(!reportPages([row('U1', 20)], { kind: 'user', id: 'U1' }, monthPeriod('2026-09', 'UTC'), '').join('').includes('🥇'));
});
