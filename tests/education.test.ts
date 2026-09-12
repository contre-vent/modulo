import { test } from 'node:test';
import assert from 'node:assert/strict';
import { educationServer, lessons } from '../src/education.js';
import { negativeCategories } from '../src/domain.js';
test('LANG-01, UI-03: every negative category has FR/EN education; HTTP does not expose reports or local files', async () => {
  for (const c of negativeCategories) for (const l of ['fr', 'en'] as const) assert.ok(lessons[c][l].why && lessons[c][l].instead);
  const server = educationServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(base + '/education/fr/sexualized_comment');
    assert.equal(response.status, 200); assert.ok((await response.text()).includes('Compliments sexualisés'));
    for (const path of ['/reports', '/.env', '/data/modulo.sqlite', '/education/fr/__proto__']) {
      assert.equal((await fetch(base + path)).status, 404);
    }
  } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
});
