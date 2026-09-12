import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireProcessLock } from '../src/process-lock.js';
test('TECH-01: prevent a second worker process from using the same database', () => {
  const dir = mkdtempSync(join(tmpdir(), 'modulo-lock-'));
  const path = join(dir, 'db.sqlite');
  try {
    const release = acquireProcessLock(path);
    assert.throws(() => acquireProcessLock(path), /déjà/);
    release();
    const releaseAgain = acquireProcessLock(path); releaseAgain();
  } finally { rmSync(dir, { recursive: true }); }
});
