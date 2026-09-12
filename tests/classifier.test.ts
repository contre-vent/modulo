import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateClassification } from '../src/classifier.js';
test('TECH-05: reject malformed model outputs and incompatible category/verdict combinations', () => {
  assert.throws(() => validateClassification({ verdict: 'positive' }));
  const valid = { verdict: 'negative', language: 'fr', categories: ['sexualized_comment'], explanation: 'Interprétation.', suggestion: 'Reformulation.' };
  assert.equal(validateClassification(valid).verdict, 'negative');
  assert.throws(() => validateClassification({ ...valid, verdict: 'positive' }));
  assert.throws(() => validateClassification({ ...valid, verdict: 'neutral' }));
  assert.throws(() => validateClassification({ ...valid, suggestion: '' }));
});
