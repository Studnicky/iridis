/**
 * ClusterMedianCutWeighted — scenario-matrix suite.
 *
 * Subject: `ClusterMedianCutWeighted` (weighted median-cut clustering).
 * Drives `clusterMedianCutWeighted.apply(colors, k)`.
 *
 * Cells:
 *   1. guard        — k validation and empty-input early return
 *   2. split        — weight-biased splitting and cluster count
 *   3. weight-inv   — total-weight preservation across all reduction sizes
 *   4. default-wt   — absent-weight treated as 1
 */

import type { ColorRecordInterfaceType }   from '@studnicky/iridis';

import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { clusterMedianCutWeighted }    from '../../src/math/ClusterMedianCutWeighted.ts';
import { colorRecordFactory }          from '../../src/math/ColorRecordFactory.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestColorFixture {
  static rgb(r: number, g: number, b: number, weight?: number): ColorRecordInterfaceType {
    const result = colorRecordFactory.fromRgb(r, g, b, {
      'hints': weight !== undefined ? { 'intent': undefined, 'role': undefined, 'weight': weight } : undefined,
      'sourceFormat': 'rgb'
    });
    return result;
  }

  static hex(code: string, weight?: number): ColorRecordInterfaceType {
    const result = colorRecordFactory.fromHex(code, {
      'hints': weight !== undefined ? { 'intent': undefined, 'role': undefined, 'weight': weight } : undefined,
      'sourceFormat': 'hex'
    });
    return result;
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — guard conditions
//
// apply() must:
//   - return [] immediately for empty input (no allocation, no throw)
//   - throw when k < 1 (includes k=0, k=-1, k=0.5)
//   - accept k=1 as the minimum valid value
// ---------------------------------------------------------------------------

type Cell1Input = {
  readonly 'colors': readonly ColorRecordInterfaceType[];
  readonly 'k': number;
};
type Cell1Output = {
  readonly 'result': ColorRecordInterfaceType[];
};

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=empty] must not throw');
      assert.deepStrictEqual(output!.result, [], '[cell=1, scenario=empty] empty array returned');
    },
    'input': { 'colors': [], 'k': 5 },
    'kind': 'happy',
    'name': 'empty input returns empty array'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=single-k1] must not throw');
      assert.strictEqual(output!.result.length, 1, '[cell=1, scenario=single-k1] one result');
    },
    'input': { 'colors': [TestColorFixture.hex('#ff0000')], 'k': 1 },
    'kind': 'happy',
    'name': 'single color k=1 returns one cluster'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=k-zero] expected throw');
      assert.match((error).message, /k must be a positive number/, '[cell=1, scenario=k-zero] message shape');
    },
    'input': { 'colors': [TestColorFixture.hex('#ff0000')], 'k': 0 },
    'kind': 'unhappy',
    'name': 'k = 0 throws with message naming the constraint'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=k-negative] expected throw');
      assert.match((error).message, /k must be a positive number/, '[cell=1, scenario=k-negative] message shape');
    },
    'input': { 'colors': [TestColorFixture.hex('#ff0000')], 'k': -5 },
    'kind': 'unhappy',
    'name': 'negative k throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=k-fractional] expected throw');
      assert.match((error).message, /k must be a positive number/, '[cell=1, scenario=k-fractional] message shape');
    },
    'input': { 'colors': [TestColorFixture.hex('#ff0000')], 'k': 0.9 },
    'kind': 'unhappy',
    'name': 'fractional k below 1 throws'
  }
];

new ScenarioRunner<Cell1Input, Cell1Output>(
  'ClusterMedianCutWeighted :: cell-1 :: guard',
  (input) => {
    const result = clusterMedianCutWeighted.apply(input.colors, input.k);
    return { 'result': result };
  }
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — weight-biased splitting
//
// The algorithm splits the bucket with the highest total-weight × widest-range
// score. This means a heavily-weighted single color should survive in its own
// cluster when the weight differential is extreme enough:
//   - a 1000-weight pure red among five equal-weight near-neutrals
//     must produce a cluster where the heaviest output is the red
//   - k > input length is clamped to input length (never throws)
//   - k = input length means no splits, all inputs survive as their own cluster
// ---------------------------------------------------------------------------

type Cell2Input = {
  readonly 'colors': readonly ColorRecordInterfaceType[];
  readonly 'k': number;
};
type Cell2Output = {
  readonly 'clusters': ColorRecordInterfaceType[];
};

const cell2Scenarios: readonly ScenarioInterface<Cell2Input, Cell2Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=heavy-red] must not throw');
      assert.strictEqual(output!.clusters.length, 2, '[cell=2, scenario=heavy-red] two clusters');
      const sorted = [...output!.clusters].sort(
        (a, b) => {return (b.hints?.weight ?? 1) - (a.hints?.weight ?? 1);}
      );
      assert.ok((sorted.at(0)!.hints?.weight ?? 0) >= 1000, '[cell=2, scenario=heavy-red] heaviest cluster carries the heavy weight');
      assert.ok(sorted.at(0)!.oklch.c > 0.1, '[cell=2, scenario=heavy-red] heaviest cluster has high chroma (red)');
    },
    'input': {
      'colors': [
        TestColorFixture.rgb(0.10, 0.10, 0.10, 1),
        TestColorFixture.rgb(0.11, 0.11, 0.11, 1),
        TestColorFixture.rgb(0.12, 0.12, 0.12, 1),
        TestColorFixture.rgb(0.13, 0.13, 0.13, 1),
        TestColorFixture.rgb(0.14, 0.14, 0.14, 1),
        TestColorFixture.rgb(1.00, 0.00, 0.00, 1000)
      ],
      'k': 2
    },
    'kind': 'happy',
    'name': 'heavily-weighted bright red survives in its own cluster'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=two-k2] must not throw');
      assert.strictEqual(output!.clusters.length, 2, '[cell=2, scenario=two-k2] two clusters out');
    },
    'input': {
      'colors': [
        TestColorFixture.hex('#ff0000', 10),
        TestColorFixture.hex('#00ff00', 10)
      ],
      'k': 2
    },
    'kind': 'happy',
    'name': 'two-color input k=2 returns exactly two clusters'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=k-clamped] must not throw');
      assert.strictEqual(output!.clusters.length, 2, '[cell=2, scenario=k-clamped] clamped to input length');
    },
    'input': {
      'colors': [
        TestColorFixture.hex('#ff0000'),
        TestColorFixture.hex('#00ff00')
      ],
      'k': 10
    },
    'kind': 'edge',
    'name': 'k > input length is clamped to input length'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=k-eq-n] must not throw');
      assert.strictEqual(output!.clusters.length, 3, '[cell=2, scenario=k-eq-n] all colors survive');
    },
    'input': {
      'colors': [TestColorFixture.hex('#ff0000', 5), TestColorFixture.hex('#00ff00', 5), TestColorFixture.hex('#0000ff', 5)],
      'k': 3
    },
    'kind': 'edge',
    'name': 'k = input length means no splits, all colors survive'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=k-one] must not throw');
      assert.strictEqual(output!.clusters.length, 1, '[cell=2, scenario=k-one] single cluster');
      const c = output!.clusters.at(0)!;
      assert.ok(Number.isFinite(c.oklch.l), '[cell=2, scenario=k-one] centroid L finite');
      assert.ok(!Number.isNaN(c.oklch.c),   '[cell=2, scenario=k-one] centroid C not NaN');
    },
    'input': {
      'colors': [
        TestColorFixture.hex('#ff0000', 10),
        TestColorFixture.hex('#00ff00', 10),
        TestColorFixture.hex('#0000ff', 10),
        TestColorFixture.hex('#ffffff', 10)
      ],
      'k': 1
    },
    'kind': 'edge',
    'name': 'four-color input reduced to one cluster'
  }
];

new ScenarioRunner<Cell2Input, Cell2Output>(
  'ClusterMedianCutWeighted :: cell-2 :: split',
  (input) => {
    const clusters = clusterMedianCutWeighted.apply(input.colors, input.k);
    return { 'clusters': clusters };
  }
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — weight invariant
//
// The sum of output cluster weights must always equal the sum of input weights
// regardless of k. This invariant holds for:
//   - k = 1 (max reduction)
//   - k = n (no reduction)
//   - k somewhere in between
//   - unequal input weights
// ---------------------------------------------------------------------------

type Cell3Input = {
  readonly 'colors': readonly ColorRecordInterfaceType[];
  readonly 'k': number;
};
const cell3Scenarios: readonly ScenarioInterface<Cell3Input, { readonly 'totalIn': number; readonly 'totalOut': number }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=four-k3] must not throw');
      assert.strictEqual(output!.totalIn, 200, '[cell=3, scenario=four-k3] total in');
      assert.strictEqual(output!.totalOut, 200, '[cell=3, scenario=four-k3] total out matches');
    },
    'input': {
      'colors': [
        TestColorFixture.rgb(0.1, 0.1, 0.1, 10),
        TestColorFixture.rgb(0.9, 0.1, 0.1, 30),
        TestColorFixture.rgb(0.1, 0.9, 0.1, 60),
        TestColorFixture.rgb(0.1, 0.1, 0.9, 100)
      ],
      'k': 3
    },
    'kind': 'happy',
    'name': 'four distinct colors k=3 preserves total weight'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=max-merge] must not throw');
      assert.strictEqual(output!.totalIn, 100, '[cell=3, scenario=max-merge] total in');
      assert.strictEqual(output!.totalOut, 100, '[cell=3, scenario=max-merge] total out matches');
    },
    'input': {
      'colors': [
        TestColorFixture.rgb(0.1, 0.1, 0.1, 10),
        TestColorFixture.rgb(0.9, 0.1, 0.1, 30),
        TestColorFixture.rgb(0.1, 0.9, 0.1, 60)
      ],
      'k': 1
    },
    'kind': 'happy',
    'name': 'k=1 (maximum merge) preserves total weight'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=no-reduction] must not throw');
      assert.strictEqual(output!.totalIn, 20, '[cell=3, scenario=no-reduction] total in');
      assert.strictEqual(output!.totalOut, 20, '[cell=3, scenario=no-reduction] total out matches');
    },
    'input': {
      'colors': [
        TestColorFixture.rgb(0.1, 0.2, 0.3, 7),
        TestColorFixture.rgb(0.4, 0.5, 0.6, 13)
      ],
      'k': 2
    },
    'kind': 'edge',
    'name': 'k = n (no reduction) preserves total weight'
  }
];

new ScenarioRunner<Cell3Input, { readonly 'totalIn': number; readonly 'totalOut': number }>(
  'ClusterMedianCutWeighted :: cell-3 :: weight-invariant',
  (input) => {
    const results = clusterMedianCutWeighted.apply(input.colors, input.k);
    const totalIn  = input.colors.reduce((s, r) => {return s + (r.hints?.weight ?? 1);}, 0);
    const totalOut = results.reduce((s, r) => {return s + (r.hints?.weight ?? 0);}, 0);
    return { 'totalIn': totalIn, 'totalOut': totalOut };
  }
).run(cell3Scenarios);

// ---------------------------------------------------------------------------
// Cell 4 — absent weight treated as 1
//
// Records with no hints.weight must be treated as weight=1:
//   - output weight equals count of weight-less inputs
//   - weight-bearing and weight-less records can coexist; totals are correct
// ---------------------------------------------------------------------------

type Cell4Input = {
  readonly 'colors': readonly ColorRecordInterfaceType[];
  readonly 'k': number;
};
const cell4Scenarios: readonly ScenarioInterface<Cell4Input, { readonly 'expectedTotal': number; readonly 'totalOut': number }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=no-weight] must not throw');
      assert.strictEqual(output!.totalOut, 2, '[cell=4, scenario=no-weight] total = count when no weight declared');
    },
    'input': {
      'colors': [
        colorRecordFactory.fromRgb(0.1, 0.1, 0.1),
        colorRecordFactory.fromRgb(0.9, 0.9, 0.9)
      ],
      'k': 2
    },
    'kind': 'happy',
    'name': 'two weight-less records → total weight = 2'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=single-no-weight] must not throw');
      assert.strictEqual(output!.totalOut, 1, '[cell=4, scenario=single-no-weight] absent weight treated as 1');
    },
    'input': {
      'colors': [colorRecordFactory.fromHex('#3b82f6')],
      'k': 1
    },
    'kind': 'edge',
    'name': 'single weight-less record → total weight = 1'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=mixed-weight] must not throw');
      assert.strictEqual(output!.expectedTotal, 10, '[cell=4, scenario=mixed-weight] expected total');
      assert.strictEqual(output!.totalOut, 10, '[cell=4, scenario=mixed-weight] total matches 1+9');
    },
    'input': {
      'colors': [
        colorRecordFactory.fromRgb(0.1, 0.1, 0.1), // weight=1 (absent)
        colorRecordFactory.fromRgb(0.9, 0.1, 0.1, { 'hints': { 'intent': undefined, 'role': undefined, 'weight': 9 }, 'sourceFormat': 'rgb' })
      ],
      'k': 2
    },
    'kind': 'edge',
    'name': 'mixed weight-bearing and weight-less: totals add correctly'
  }
];

new ScenarioRunner<Cell4Input, { readonly 'expectedTotal': number; readonly 'totalOut': number }>(
  'ClusterMedianCutWeighted :: cell-4 :: default-weight',
  (input) => {
    const results = clusterMedianCutWeighted.apply(input.colors, input.k);
    const totalOut = results.reduce((s, r) => {return s + (r.hints?.weight ?? 0);}, 0);
    const expectedTotal = input.colors.reduce((s, r) => {return s + (r.hints?.weight ?? 1);}, 0);
    return { 'expectedTotal': expectedTotal, 'totalOut': totalOut };
  }
).run(cell4Scenarios);
