import { openSync, readFileSync, closeSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** The POC runs one worker process per SQLite database. Never disturb a live owner. */
export function acquireProcessLock(databasePath: string) {
  const path = resolve(databasePath) + '.lock';
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
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
  return () => { try { if (readFileSync(path, 'utf8') === String(process.pid)) unlinkSync(path); } catch { /* already removed */ } };
}
