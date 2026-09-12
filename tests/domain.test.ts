import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCounts } from '../src/domain.js';

test('STAT-02/03: denominator includes neutral messages', () => {
  assert.deepEqual(scoreCounts(30, 5, 65), {
    total: 100, positivePercent: 30, negativePercent: 5, score: 25,
  });
});

test('STAT-03: score bounds and empty population', () => {
  assert.equal(scoreCounts(4, 0, 0).score, 100);
  assert.equal(scoreCounts(0, 4, 0).score, -100);
  assert.equal(scoreCounts(0, 0, 4).score, 0);
  assert.equal(scoreCounts(0, 0, 0).score, null);
  assert.throws(() => scoreCounts(-1, 0, 0));
});
