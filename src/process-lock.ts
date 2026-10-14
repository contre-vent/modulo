import { openSync, readFileSync, closeSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/** The POC runs one worker process per SQLite database. Never disturb a live owner. */
export function acquireProcessLock(databasePath: string) {
  const path = resolve(databasePath) + '.lock';
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  // Keep this file in place: SQLite releases its OS lock even after a crash.
  // A separate database leaves the application's data available to diagnostics.
  const guard = new DatabaseSync(path + '.sqlite');
  try {
    guard.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE');
    // Retain the PID file check for compatibility with a running older version.
    try {
      const owner = Number(readFileSync(path, 'utf8'));
      if (!Number.isSafeInteger(owner) || owner <= 0) throw new Error('Fichier verrou invalide : vérifier le processus avant de retirer le verrou.');
      let alive = true;
      try { process.kill(owner, 0); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ESRCH') alive = false; else throw e; }
      if (alive) throw new Error('Modulo utilise déjà cette base dans un autre processus.');
      unlinkSync(path);
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    const fd = openSync(path, 'wx', 0o600);
    try { writeFileSync(fd, String(process.pid)); } finally { closeSync(fd); }
  } catch (e) {
    guard.close();
    if ((e as { errcode?: number }).errcode === 5) throw new Error('Modulo utilise déjà cette base dans un autre processus.');
    throw e;
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    try { if (readFileSync(path, 'utf8') === String(process.pid)) unlinkSync(path); } catch { /* already removed */ }
    finally { guard.close(); }
  };
}
