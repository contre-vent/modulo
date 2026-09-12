import 'dotenv/config';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { OpenAIClassifier, classifierVersion } from '../src/classifier.js';
import { errorCode } from '../src/slack.js';

const cases = JSON.parse(readFileSync(new URL('../evals/cases.json', import.meta.url), 'utf8')) as {
  id: string; text: string; expected: string[]; category?: string; language: string;
}[];
if (!process.env.OPENAI_API_KEY) throw new Error('Configurer OPENAI_API_KEY dans .env.');
const model = process.env.OPENAI_MODEL || 'gpt-6-astra';
const classifier = new OpenAIClassifier(model, process.env.OPENAI_API_KEY);
const results = [];
for (const item of cases) {
  const start = Date.now();
  try {
    const result = await classifier.classify({ channelId: 'CEVAL', userId: 'UEVAL', ts: '1789230000.000001', threadTs: null, text: item.text }, []);
    const pass = item.expected.includes(result.verdict) && (!item.category || result.categories.includes(item.category as never)) && result.language === item.language;
    const row = { id: item.id, pass, verdict: result.verdict, categories: result.categories, language: result.language, ms: Date.now() - start };
    results.push(row); console.log(JSON.stringify(row));
  } catch (error) {
    results.push({ id: item.id, pass: false, error: errorCode(error), ms: Date.now() - start });
    console.error(JSON.stringify({ id: item.id, error: errorCode(error) }));
    if (results.length === 1) break; // Do not repeat a bad credential/model request across the suite.
  }
}
mkdirSync('eval-results', { recursive: true });
const summary = { model, version: classifierVersion, date: new Date().toISOString(), passed: results.filter(r => r.pass).length,
  executed: results.length, total: cases.length, results };
writeFileSync('eval-results/latest.json', JSON.stringify(summary, null, 2));
console.log(`${summary.passed}/${summary.total} cas réussis (${summary.executed} exécutés).`);
if (summary.passed !== summary.total) process.exitCode = 1;
