import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { educationServer, lessons, escapeHtml } from '../src/education.js';
import { negativeCategories } from '../src/domain.js';

// Only generated, generic pages enter this deployment directory. No dotenv, Slack or database imports.
const output = resolve('dist/education/.vercel/output');
const server = educationServer();
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Missing local server address');
try {
  for (const language of ['fr', 'en'] as const) {
    const directory = join(output, 'static', 'education', language);
    mkdirSync(directory, { recursive: true });
    for (const category of negativeCategories) {
      const response = await fetch(`http://127.0.0.1:${address.port}/education/${language}/${category}`);
      if (!response.ok) throw new Error('Education rendering failed');
      writeFileSync(join(directory, `${category}.html`), await response.text());
    }
  }
  writeFileSync(join(output, 'static', 'index.html'), `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Modulo · Communication respectueuse</title><style>body{font:18px/1.65 system-ui;max-width:44rem;margin:4rem auto;padding:0 1.5rem;color:#253245}a{color:#135a9c}</style><main><h1>Modulo</h1><p>Des repères pour des échanges professionnels respectueux.</p><ul>${negativeCategories.map(c => `<li>${escapeHtml(lessons[c].fr.title)} : <a href="/education/fr/${c}">Français</a> · <a href="/education/en/${c}">English</a></li>`).join('')}</ul></main></html>`);
  writeFileSync(join(output, 'static', '404.html'), '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Page introuvable</title><h1>Page introuvable</h1><a href="/">Modulo</a></html>');
  writeFileSync(join(output, 'config.json'), JSON.stringify({ version: 3, routes: [
    { src: '/.*', headers: { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" }, continue: true },
    { src: '/education/(fr|en)/([a-z_]+)', dest: '/education/$1/$2.html' },
    { handle: 'filesystem' },
    { src: '/.*', status: 404, dest: '/404.html' },
  ] }, null, 2));
  console.log('18 pages statiques générées dans dist/education/.vercel/output ; aucun secret ni contenu Slack.');
} finally { await new Promise<void>(resolve => server.close(() => resolve())); }
