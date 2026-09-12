import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMessage, eligibleChannel } from '../src/events.js';

const base = { type: 'message', channel: 'C123', user: 'U123', ts: '1789230000.000001', text: 'Merci pour ton aide !' };
test('SCOPE-05, TECH-02: accept human text and replies, not bots, files or emoji-only messages', () => {
  assert.ok(normalizeMessage(base, 'UBOT'));
  assert.equal(normalizeMessage({ ...base, thread_ts: base.ts }, 'UBOT')?.threadTs, base.ts);
  for (const extra of [{ channel: 'D123' }, { bot_id: 'B123' }, { app_id: 'A123' }, { user: 'UBOT' },
    { text: '❤️ :heart: :custom_emoji:' }, { files: [{}] }, { subtype: 'channel_join' }]) {
    assert.equal(normalizeMessage({ ...base, ...extra }, 'UBOT'), null);
  }
});
test('OPEN-02 confirmed: ignore edits and deletions', () => {
  assert.equal(normalizeMessage({ ...base, subtype: 'message_changed', message: base }, 'UBOT'), null);
  assert.equal(normalizeMessage({ ...base, subtype: 'message_deleted' }, 'UBOT'), null);
});
test('SCOPE-02/05: private, archived and externally shared channels are not eligible', () => {
  assert.ok(eligibleChannel({ id: 'C123', name: 'general' }));
  for (const flag of ['is_private', 'is_archived', 'is_ext_shared', 'is_pending_ext_shared', 'is_im', 'is_mpim']) {
    assert.equal(eligibleChannel({ id: 'C123', name: 'general', [flag]: true }), false);
  }
});
