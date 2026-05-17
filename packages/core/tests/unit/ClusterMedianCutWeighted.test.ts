/**
 * ClusterMedianCutWeighted unit suite.
 *
 * Asserts the weighted variant collapses heavily-weighted regions
 * differently from the unweighted median-cut — a single record with
 * extremely high weight survives reduction as its own cluster instead
 * of being merged into a larger neighbourhood.
 */
import { describe, it } from 'node:test';
import assert           from 'node:assert/strict';

import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { clusterMedianCutWeighted } from '../../src/math/ClusterMedianCutWeighted.ts';

describe('ClusterMedianCutWeighted', () => {
  it('returns empty array on empty input', () => {
    assert.deepStrictEqual(clusterMedianCutWeighted.apply([], 5), []);
  });

  it('throws when k < 1', () => {
    assert.throws(
      () => clusterMedianCutWeighted.apply([colorRecordFactory.fromHex('#ff0000')], 0),
      /k must be a positive number/,
    );
  });

  it('clamps k to input length', () => {
    const colors = [
      colorRecordFactory.fromHex('#ff0000'),
      colorRecordFactory.fromHex('#00ff00'),
    ];
    const out = clusterMedianCutWeighted.apply(colors, 10);
    assert.strictEqual(out.length, 2);
  });

  it('a heavily-weighted color survives reduction in its own cluster', () => {
    // Five near-neutrals plus one heavily-weighted bright red. Weighted
    // median-cut should split the bright-red bucket out by itself
    // because its total weight dominates the bucket-selection heuristic.
    const inputs = [
      colorRecordFactory.fromRgb(0.10, 0.10, 0.10, 1, 'rgb', { 'weight': 1 }),
      colorRecordFactory.fromRgb(0.11, 0.11, 0.11, 1, 'rgb', { 'weight': 1 }),
      colorRecordFactory.fromRgb(0.12, 0.12, 0.12, 1, 'rgb', { 'weight': 1 }),
      colorRecordFactory.fromRgb(0.13, 0.13, 0.13, 1, 'rgb', { 'weight': 1 }),
      colorRecordFactory.fromRgb(0.14, 0.14, 0.14, 1, 'rgb', { 'weight': 1 }),
      colorRecordFactory.fromRgb(1.00, 0.00, 0.00, 1, 'rgb', { 'weight': 1000 }),
    ];
    const out = clusterMedianCutWeighted.apply(inputs, 2);
    assert.strictEqual(out.length, 2);
    // The heaviest output cluster should be near pure red.
    const sorted = [...out].sort((a, b) => (b.hints?.weight ?? 1) - (a.hints?.weight ?? 1));
    const heaviest = sorted[0];
    assert.ok(heaviest !== undefined);
    assert.ok((heaviest.hints?.weight ?? 0) >= 1000, 'heaviest cluster carries the heavy input weight');
    assert.ok(heaviest.oklch.c > 0.1, 'heaviest cluster has high chroma (red)');
  });

  it('preserves total weight: sum of output weights equals sum of input weights', () => {
    const inputs = [
      colorRecordFactory.fromRgb(0.1, 0.1, 0.1, 1, 'rgb', { 'weight':  10 }),
      colorRecordFactory.fromRgb(0.9, 0.1, 0.1, 1, 'rgb', { 'weight':  30 }),
      colorRecordFactory.fromRgb(0.1, 0.9, 0.1, 1, 'rgb', { 'weight':  60 }),
      colorRecordFactory.fromRgb(0.1, 0.1, 0.9, 1, 'rgb', { 'weight': 100 }),
    ];
    const out = clusterMedianCutWeighted.apply(inputs, 3);
    const totalIn  = 10 + 30 + 60 + 100;
    const totalOut = out.reduce((s, r) => s + (r.hints?.weight ?? 0), 0);
    assert.strictEqual(totalOut, totalIn);
  });

  it('treats absent weight as 1', () => {
    const inputs = [
      colorRecordFactory.fromRgb(0.1, 0.1, 0.1),
      colorRecordFactory.fromRgb(0.9, 0.9, 0.9),
    ];
    const out = clusterMedianCutWeighted.apply(inputs, 2);
    const totalOut = out.reduce((s, r) => s + (r.hints?.weight ?? 0), 0);
    assert.strictEqual(totalOut, 2);
  });
});
