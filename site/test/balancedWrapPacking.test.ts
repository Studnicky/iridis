/**
 * Pure-logic coverage for packBalancedRows — the greedy real-width wrap and
 * trailing-row rebalance BalancedWrap.vue packs items with.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { packBalancedRows } from '../app/composables/packBalancedRows.ts';

await test('packs every item onto one row when they all fit', () => {
  const rows = packBalancedRows([100, 100, 100], 400, 8);
  assert.deepEqual(rows, [[0, 1, 2]]);
});

await test('wraps to a new row once the next item would overflow the container', () => {
  const rows = packBalancedRows([100, 100, 100], 207, 8);
  assert.deepEqual(rows, [[0], [1], [2]]);
});

await test('a single item wider than the container still gets its own row instead of shrinking', () => {
  const rows = packBalancedRows([500], 200, 8);
  assert.deepEqual(rows, [[0]]);
});

await test('rebalances a lonely trailing item off a fuller earlier row when it fits', () => {
  // Greedy alone would produce [[0,1,2],[3]] (item 3 alone on row 2) —
  // rebalance should pull item 2 down so both rows carry 2 items instead of
  // leaving row 2 disproportionately short.
  const rows = packBalancedRows([100, 100, 100, 100], 316, 8);
  assert.deepEqual(rows, [[0, 1], [2, 3]]);
});

await test('never rebalances past the container width', () => {
  // Row 2 (item 3 alone) can't absorb item 2 without exceeding containerWidth
  // (100 + 8 + 100 = 208 > 207), so it must stay put even though it's short.
  const rows = packBalancedRows([100, 100, 100, 100], 207, 8);
  assert.deepEqual(rows, [[0], [1], [2], [3]]);
});
