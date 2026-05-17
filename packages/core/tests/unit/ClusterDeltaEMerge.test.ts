/**
 * ClusterDeltaEMerge unit suite.
 *
 * Asserts agglomerative deltaE2000 merging collapses visually-near
 * colours together while preserving total weight, and that the heaviest
 * surviving cluster reflects the dominant input region.
 */
import { describe, it } from 'node:test';
import assert           from 'node:assert/strict';

import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { clusterDeltaEMerge } from '../../src/math/ClusterDeltaEMerge.ts';

describe('ClusterDeltaEMerge', () => {
  it('returns empty array on empty input', () => {
    assert.deepStrictEqual(clusterDeltaEMerge.apply([], 5), []);
  });

  it('throws when k < 1', () => {
    assert.throws(
      () => clusterDeltaEMerge.apply([colorRecordFactory.fromHex('#ff0000')], 0),
      /k must be a positive number/,
    );
  });

  it('passes through unchanged count when k >= input length', () => {
    const inputs = [
      colorRecordFactory.fromHex('#ff0000'),
      colorRecordFactory.fromHex('#00ff00'),
    ];
    const out = clusterDeltaEMerge.apply(inputs, 10);
    assert.strictEqual(out.length, 2);
  });

  it('merges visually-near colors into a single cluster', () => {
    // Three near-reds + one distinct green → request 2 clusters →
    // reds collapse into one cluster, green survives alone.
    const inputs = [
      colorRecordFactory.fromHex('#ff0000', undefined, 'hex', { 'weight': 10 }),
      colorRecordFactory.fromHex('#fa0505', undefined, 'hex', { 'weight': 10 }),
      colorRecordFactory.fromHex('#f00a0a', undefined, 'hex', { 'weight': 10 }),
      colorRecordFactory.fromHex('#00aa00', undefined, 'hex', { 'weight': 10 }),
    ];
    const out = clusterDeltaEMerge.apply(inputs, 2);
    assert.strictEqual(out.length, 2);
    const sorted = [...out].sort((a, b) => (b.hints?.weight ?? 1) - (a.hints?.weight ?? 1));
    const heavy = sorted[0];
    const light = sorted[1];
    assert.ok(heavy !== undefined && light !== undefined);
    // The merged red cluster carries 3× the input weight.
    assert.strictEqual(heavy.hints?.weight, 30);
    assert.strictEqual(light.hints?.weight, 10);
  });

  it('preserves total weight across merges', () => {
    const inputs = [
      colorRecordFactory.fromHex('#aa0000', undefined, 'hex', { 'weight':  5 }),
      colorRecordFactory.fromHex('#aa00aa', undefined, 'hex', { 'weight': 15 }),
      colorRecordFactory.fromHex('#00aaaa', undefined, 'hex', { 'weight': 25 }),
      colorRecordFactory.fromHex('#aaaa00', undefined, 'hex', { 'weight':  7 }),
    ];
    const out = clusterDeltaEMerge.apply(inputs, 2);
    const totalIn  = 5 + 15 + 25 + 7;
    const totalOut = out.reduce((s, r) => s + (r.hints?.weight ?? 0), 0);
    assert.strictEqual(totalOut, totalIn);
  });
});
