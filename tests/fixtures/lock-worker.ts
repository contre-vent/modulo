import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

const path = process.argv[2]!;
const originalRead = fs.readFileSync;
// Simulate a process being preempted after reading a stale PID. Without an
// atomic guard, another starter can replace the PID file during this pause.
fs.readFileSync = ((...args: Parameters<typeof fs.readFileSync>) => {
  const value = originalRead(...args);
  if (String(args[0]) === path + '.lock' && String(value) === '2147483647') {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  return value;
}) as typeof fs.readFileSync;
syncBuiltinESMExports();
const { acquireProcessLock } = await import('../../src/process-lock.js');
let release: (() => void) | undefined;
process.on('message', message => {
  if (message === 'go') {
    try {
      release = acquireProcessLock(path);
      process.send?.('acquired');
    } catch (error) {
      process.send?.(error instanceof Error && /déjà/.test(error.message) ? 'busy' : 'unexpected_error');
      process.disconnect();
    }
  } else if (message === 'release') {
    release?.();
    process.disconnect();
  }
});
process.send?.('ready');
