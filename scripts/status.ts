import 'dotenv/config';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const path = process.env.DATABASE_PATH || './data/modulo.sqlite';
if (!existsSync(path)) { console.log('Aucune base locale : Modulo n’a pas encore observé de messages.'); }
else {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    console.log(JSON.stringify({
      channels: db.prepare('SELECT id,name,activated_at,eligible FROM channels ORDER BY id').all(),
      messages: db.prepare('SELECT status,COUNT(*) AS count FROM messages GROUP BY status').all(),
      deliveries: db.prepare('SELECT state,COUNT(*) AS count FROM outbox GROUP BY state').all(),
      deliveryErrors: db.prepare("SELECT id,last_error FROM outbox WHERE state='uncertain'").all(),
      reports: db.prepare('SELECT month FROM monthly_reports ORDER BY month').all(),
    }, null, 2));
  } finally { db.close(); }
}
