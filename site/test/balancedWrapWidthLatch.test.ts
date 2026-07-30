/**
 * Coverage for useBalancedWidthLatch — the width hysteresis that keeps
 * BalancedWrap.vue's row packing from oscillating when a debounced
 * ResizeObserver reports a container width jittering by a few sub-threshold
 * pixels around a row-count boundary (see packBalancedRows.ts for the
 * packing algorithm itself).
 */

import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('./fixtures/NuxtImportsLoader.mjs', import.meta.url);

const BalancedWrapWidthLatchTestModules = Object.freeze({
  'BALANCED_WRAP_CONSTANTS': (await import('../app/composables/constants/BalancedWrapConstants.ts')).BALANCED_WRAP_CONSTANTS,
  'packBalancedRows': (await import('../app/composables/packBalancedRows.ts')).packBalancedRows,
  'useBalancedWidthLatch': (await import('../app/composables/useBalancedWidthLatch.ts')).useBalancedWidthLatch
});

await test('the first reading is accepted as-is', () => {
  const accept = BalancedWrapWidthLatchTestModules.useBalancedWidthLatch(10);
  assert.equal(accept(500), 500);
});

await test('a jitter smaller than the threshold does not move the latched width', () => {
  const accept = BalancedWrapWidthLatchTestModules.useBalancedWidthLatch(10);
  assert.equal(accept(500), 500);
  assert.equal(accept(505), 500);
  assert.equal(accept(495), 500);
  assert.equal(accept(508), 500);
});

await test('a change at or past the threshold is accepted and becomes the new baseline', () => {
  const accept = BalancedWrapWidthLatchTestModules.useBalancedWidthLatch(10);
  assert.equal(accept(500), 500);
  assert.equal(accept(511), 511);
  // subsequent jitter is now measured from the new baseline (511)
  assert.equal(accept(515), 511);
  assert.equal(accept(522), 522);
});

await test('default threshold matches BALANCED_WRAP_CONSTANTS.WIDTH_HYSTERESIS_PX', () => {
  const accept = BalancedWrapWidthLatchTestModules.useBalancedWidthLatch();
  assert.equal(accept(400), 400);
  const justUnder = BalancedWrapWidthLatchTestModules.BALANCED_WRAP_CONSTANTS.WIDTH_HYSTERESIS_PX - 1;
  assert.equal(accept(400 + justUnder), 400);
  const atThreshold = BalancedWrapWidthLatchTestModules.BALANCED_WRAP_CONSTANTS.WIDTH_HYSTERESIS_PX;
  assert.equal(accept(400 + atThreshold), 400 + atThreshold);
});

/**
 * The behavioral property the site's oscillation bug hinges on: three
 * width-100 items at gap 8 flip between 2 rows and 3 rows exactly at a
 * container width of 208 (balancedWrapPacking.test.ts pins this boundary
 * directly). Packing straight off a raw width that jitters across that
 * boundary flips the row count every reading; packing off the latched width
 * must not.
 */
await test('container width jittering across a packing boundary does not change the row count once latched', () => {
  const widths = [100, 100, 100];
  const gap = 8;
  const accept = BalancedWrapWidthLatchTestModules.useBalancedWidthLatch(24);

  const rawReadings = [207, 209, 207, 209, 207, 209, 207];
  const rowCounts: number[] = [];
  for (const rawReading of rawReadings) {
    const latchedWidth = accept(rawReading);
    rowCounts.push(BalancedWrapWidthLatchTestModules.packBalancedRows(widths, latchedWidth, gap).length);
  }

  assert.deepEqual(rowCounts, [3, 3, 3, 3, 3, 3, 3]);
});

await test('a genuine resize (well past the hysteresis band) still repacks correctly', () => {
  const widths = [100, 100, 100];
  const gap = 8;
  const accept = BalancedWrapWidthLatchTestModules.useBalancedWidthLatch(24);

  const settledAtNarrow = BalancedWrapWidthLatchTestModules.packBalancedRows(widths, accept(207), gap);
  assert.equal(settledAtNarrow.length, 3);

  // A real window resize moves width by far more than the 24px band.
  const afterResize = BalancedWrapWidthLatchTestModules.packBalancedRows(widths, accept(400), gap);
  assert.equal(afterResize.length, 1);
});
