/**
 * Pure-logic coverage for ColorStreamCard's axis-mapping functions — canvas
 * drawing itself has no meaningful assertable behavior outside a real DOM.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sampleIndexToX, scaleChromaToY } from '../app/composables/colorStreamAxis.ts';

test('scaleChromaToY maps the min to the bottom and the max to the top, with padding', () => {
  const bottom = scaleChromaToY(0, 0, 1, 100);
  const top = scaleChromaToY(1, 0, 1, 100);
  assert.ok(bottom > top);
  assert.ok(bottom < 100);
  assert.ok(top > 0);
});

test('scaleChromaToY returns the vertical midpoint when min equals max (flat buffer)', () => {
  assert.equal(scaleChromaToY(0.2, 0.2, 0.2, 100), 50);
});

test('sampleIndexToX maps index 0 to the left edge and the last index to the right edge', () => {
  assert.equal(sampleIndexToX(0, 5, 200), 0);
  assert.equal(sampleIndexToX(4, 5, 200), 200);
});

test('sampleIndexToX places a single sample at the right edge', () => {
  assert.equal(sampleIndexToX(0, 1, 200), 200);
});
