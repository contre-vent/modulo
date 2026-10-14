import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { fork } from 'node:child_process';
import { once } from 'node:events';
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
    const releaseAgain = acquireProcessLock(path);
    release(); // Releasing twice must not disturb a subsequent owner.
    assert.throws(() => acquireProcessLock(path), /déjà/);
    releaseAgain();
  } finally { rmSync(dir, { recursive: true }); }
});

test('TECH-01: preserve live legacy PID files and reject invalid lock files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'modulo-lock-'));
  const path = join(dir, 'db.sqlite');
  try {
    writeFileSync(path + '.lock', String(process.pid));
    assert.throws(() => acquireProcessLock(path), /déjà/);
    assert.equal(readFileSync(path + '.lock', 'utf8'), String(process.pid));
    writeFileSync(path + '.lock', 'invalid');
    assert.throws(() => acquireProcessLock(path), /invalide/);
    assert.equal(readFileSync(path + '.lock', 'utf8'), 'invalid');
  } finally { rmSync(dir, { recursive: true }); }
});

test('TECH-01/06: simultaneous stale-lock recovery allows one worker and recovers after a crash', { timeout: 15_000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'modulo-lock-race-'));
  const path = join(dir, 'db.sqlite');
  writeFileSync(path + '.lock', '2147483647');
  const children = Array.from({ length: 4 }, () => fork(new URL('./fixtures/lock-worker.ts', import.meta.url), [path], {
    execArgv: ['--import', 'tsx'], stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  }));
  const exited = children.map(child => once(child, 'exit'));
  const message = (child: typeof children[number]) => once(child, 'message', { signal: AbortSignal.timeout(5000) });
  try {
    const ready = await Promise.all(children.map(message));
    assert.ok(ready.every(([value]) => value === 'ready'));
    const results = children.map(message);
    for (const child of children) child.send('go');
    const outcomes = (await Promise.all(results)).map(([value]) => value);
    assert.equal(outcomes.filter(value => value === 'acquired').length, 1);
    assert.equal(outcomes.filter(value => value === 'busy').length, 3);
    assert.throws(() => acquireProcessLock(path), /déjà/);

    const winner = outcomes.indexOf('acquired');
    children[winner]!.kill('SIGKILL');
    await exited[winner];
    const release = acquireProcessLock(path);
    assert.equal(readFileSync(path + '.lock', 'utf8'), String(process.pid));
    release();
  } finally {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await Promise.all(exited);
    rmSync(dir, { recursive: true });
  }
});
