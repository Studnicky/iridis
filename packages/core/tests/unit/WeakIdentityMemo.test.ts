import assert from 'node:assert/strict';
import { test } from 'node:test';

import { WeakIdentityMemo } from '../../src/model/WeakIdentityMemo.ts';

void test('weak identity memo computes once for one key', () => {
  const memo = new WeakIdentityMemo<object, number>();
  const key = {};
  let computations = 0;
  const first = memo.get(key, () => {
    computations += 1;
    return computations;
  });
  const second = memo.get(key, () => {
    computations += 1;
    return computations;
  });
  assert.strictEqual(first, 1);
  assert.strictEqual(second, 1);
  assert.strictEqual(computations, 1);
});

void test('weak identity memo distinguishes paired keys', () => {
  const memo = WeakIdentityMemo.pair<object, object, number>();
  const firstKey = {};
  const secondKey = {};
  const thirdKey = {};
  let computations = 0;
  const first = memo.get(firstKey, secondKey, () => {
    computations += 1;
    return computations;
  });
  const repeated = memo.get(firstKey, secondKey, () => {
    computations += 1;
    return computations;
  });
  const distinct = memo.get(firstKey, thirdKey, () => {
    computations += 1;
    return computations;
  });
  assert.strictEqual(first, 1);
  assert.strictEqual(repeated, 1);
  assert.strictEqual(distinct, 2);
  assert.strictEqual(computations, 2);
});
