/** Pure-logic coverage for ColorStreamCard.vue's naive-vs-engine comparison bands. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { colorStreamComparison } from '../app/composables/colorStreamComparison.ts';
import { TestPatterns } from './fixtures/TestPatterns.ts';

await test('naiveRgbLerpHex returns the from color at t=0 and the to color at t=1', () => {
  assert.equal(colorStreamComparison.naiveRgbLerpHex('#000000', '#ffffff', 0), '#000000');
  assert.equal(colorStreamComparison.naiveRgbLerpHex('#000000', '#ffffff', 1), '#ffffff');
});

await test('naiveRgbLerpHex produces the RGB midpoint at t=0.5', () => {
  assert.equal(colorStreamComparison.naiveRgbLerpHex('#000000', '#ffffff', 0.5), '#808080');
});

await test('oklchLerpHex returns a valid hex string across a hue swing', () => {
  const hex = colorStreamComparison.oklchLerpHex(0.7, 0.15, 250, 0.7, 0.15, 70, 0.5);
  assert.match(hex, TestPatterns.HEX);
});

await test('buildComparisonBands returns naive and engine bands of equal length, both valid hex colors', () => {
  const bands = colorStreamComparison.buildComparisonBands(0.7, 0.15, 250, 0.7, 0.15, 70, 8);
  assert.equal(bands.naive.length, 8);
  assert.equal(bands.engine.length, 8);
  const colors = [...bands.naive, ...bands.engine];
  const colorCount = colors.length;
  for (let colorIndex = 0; colorIndex < colorCount; colorIndex += 1) {
    const hex = colors[colorIndex];
    if (hex === undefined) {throw new RangeError('comparison color is missing');}
    assert.match(hex, TestPatterns.HEX);
  }
});

await test('buildComparisonBands: the naive RGB lerp dips visibly further toward gray (lower saturation) at its midpoint than the OKLCH lerp, for a complementary hue swing', () => {
  const bands = colorStreamComparison.buildComparisonBands(0.7, 0.2, 250, 0.7, 0.2, 70, 9);
  const mid = 4;

  function saturation(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const maximum = Math.max(r, g, b);
    const minimum = Math.min(r, g, b);
    return maximum === 0 ? 0 : (maximum - minimum) / maximum;
  }

  const naiveSat = saturation(bands.naive[mid]!);
  const engineSat = saturation(bands.engine[mid]!);
  assert.ok(naiveSat < engineSat, `expected naive midpoint (${naiveSat}) to be less saturated than engine midpoint (${engineSat})`);
});
