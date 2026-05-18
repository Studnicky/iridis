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

import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import { colorRecordFactory }          from '../../src/math/ColorRecordFactory.ts';
import { clusterMedianCutWeighted }    from '../../src/math/ClusterMedianCutWeighted.ts';
import type { ColorRecordInterface }   from '@studnicky/iridis';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function rgb(r: number, g: number, b: number, weight?: number): ColorRecordInterface {
  return colorRecordFactory.fromRgb(
    r, g, b, 1, 'rgb',
    weight !== undefined ? { 'weight': weight } : undefined,
  );
}

function hex(code: string, weight?: number): ColorRecordInterface {
  return colorRecordFactory.fromHex(
    code, undefined, 'hex',
    weight !== undefined ? { 'weight': weight } : undefined,
  );
}

// ---------------------------------------------------------------------------
// Cell 1 — guard conditions
//
// apply() must:
//   - return [] immediately for empty input (no allocation, no throw)
//   - throw when k < 1 (includes k=0, k=-1, k=0.5)
//   - accept k=1 as the minimum valid value
// ---------------------------------------------------------------------------

interface Cell1Input {
  readonly colors: readonly ColorRecordInterface[];
  readonly k: number;
}
interface Cell1Output {
  readonly result: ColorRecordInterface[];
}

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    name: 'empty input returns empty array',
    kind: 'happy',
    input: { colors: [], k: 5 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=empty] must not throw');
      assert.deepStrictEqual(output!.result, [], '[cell=1, scenario=empty] empty array returned');
    },
  },
  {
    name: 'single color k=1 returns one cluster',
    kind: 'happy',
    input: { colors: [hex('#ff0000')], k: 1 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=single-k1] must not throw');
      assert.strictEqual(output!.result.length, 1, '[cell=1, scenario=single-k1] one result');
    },
  },
  {
    name: 'k = 0 throws with message naming the constraint',
    kind: 'unhappy',
    input: { colors: [hex('#ff0000')], k: 0 },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=k-zero] expected throw');
      assert.match((error as Error).message, /k must be a positive number/, '[cell=1, scenario=k-zero] message shape');
    },
  },
  {
    name: 'negative k throws',
    kind: 'unhappy',
    input: { colors: [hex('#ff0000')], k: -5 },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=k-negative] expected throw');
      assert.match((error as Error).message, /k must be a positive number/, '[cell=1, scenario=k-negative] message shape');
    },
  },
  {
    name: 'fractional k below 1 throws',
    kind: 'unhappy',
    input: { colors: [hex('#ff0000')], k: 0.9 },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=k-fractional] expected throw');
      assert.match((error as Error).message, /k must be a positive number/, '[cell=1, scenario=k-fractional] message shape');
    },
  },
];

new ScenarioRunner<Cell1Input, Cell1Output>(
  'ClusterMedianCutWeighted :: cell-1 :: guard',
  (input) => {
    const result = clusterMedianCutWeighted.apply(input.colors, input.k);
    return { result };
  },
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

interface Cell2Input {
  readonly colors: readonly ColorRecordInterface[];
  readonly k: number;
}
interface Cell2Output {
  readonly clusters: ColorRecordInterface[];
}

const cell2Scenarios: readonly ScenarioInterface<Cell2Input, Cell2Output>[] = [
  {
    name: 'heavily-weighted bright red survives in its own cluster',
    kind: 'happy',
    input: {
      colors: [
        rgb(0.10, 0.10, 0.10, 1),
        rgb(0.11, 0.11, 0.11, 1),
        rgb(0.12, 0.12, 0.12, 1),
        rgb(0.13, 0.13, 0.13, 1),
        rgb(0.14, 0.14, 0.14, 1),
        rgb(1.00, 0.00, 0.00, 1000),
      ],
      k: 2,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=heavy-red] must not throw');
      assert.strictEqual(output!.clusters.length, 2, '[cell=2, scenario=heavy-red] two clusters');
      const sorted = [...output!.clusters].sort(
        (a, b) => (b.hints?.weight ?? 1) - (a.hints?.weight ?? 1),
      );
      assert.ok((sorted[0]!.hints?.weight ?? 0) >= 1000, '[cell=2, scenario=heavy-red] heaviest cluster carries the heavy weight');
      assert.ok(sorted[0]!.oklch.c > 0.1, '[cell=2, scenario=heavy-red] heaviest cluster has high chroma (red)');
    },
  },
  {
    name: 'two-color input k=2 returns exactly two clusters',
    kind: 'happy',
    input: {
      colors: [
        hex('#ff0000', 10),
        hex('#00ff00', 10),
      ],
      k: 2,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=two-k2] must not throw');
      assert.strictEqual(output!.clusters.length, 2, '[cell=2, scenario=two-k2] two clusters out');
    },
  },
  {
    name: 'k > input length is clamped to input length',
    kind: 'edge',
    input: {
      colors: [
        hex('#ff0000'),
        hex('#00ff00'),
      ],
      k: 10,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=k-clamped] must not throw');
      assert.strictEqual(output!.clusters.length, 2, '[cell=2, scenario=k-clamped] clamped to input length');
    },
  },
  {
    name: 'k = input length means no splits, all colors survive',
    kind: 'edge',
    input: {
      colors: [hex('#ff0000', 5), hex('#00ff00', 5), hex('#0000ff', 5)],
      k: 3,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=k-eq-n] must not throw');
      assert.strictEqual(output!.clusters.length, 3, '[cell=2, scenario=k-eq-n] all colors survive');
    },
  },
  {
    name: 'four-color input reduced to one cluster',
    kind: 'edge',
    input: {
      colors: [
        hex('#ff0000', 10),
        hex('#00ff00', 10),
        hex('#0000ff', 10),
        hex('#ffffff', 10),
      ],
      k: 1,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=k-one] must not throw');
      assert.strictEqual(output!.clusters.length, 1, '[cell=2, scenario=k-one] single cluster');
      const c = output!.clusters[0]!;
      assert.ok(Number.isFinite(c.oklch.l), '[cell=2, scenario=k-one] centroid L finite');
      assert.ok(!Number.isNaN(c.oklch.c),   '[cell=2, scenario=k-one] centroid C not NaN');
    },
  },
];

new ScenarioRunner<Cell2Input, Cell2Output>(
  'ClusterMedianCutWeighted :: cell-2 :: split',
  (input) => {
    const clusters = clusterMedianCutWeighted.apply(input.colors, input.k);
    return { clusters };
  },
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

interface Cell3Input {
  readonly colors: readonly ColorRecordInterface[];
  readonly k: number;
}
interface Cell3Output {
  readonly totalIn: number;
  readonly totalOut: number;
}

const cell3Scenarios: readonly ScenarioInterface<Cell3Input, Cell3Output>[] = [
  {
    name: 'four distinct colors k=3 preserves total weight',
    kind: 'happy',
    input: {
      colors: [
        rgb(0.1, 0.1, 0.1, 10),
        rgb(0.9, 0.1, 0.1, 30),
        rgb(0.1, 0.9, 0.1, 60),
        rgb(0.1, 0.1, 0.9, 100),
      ],
      k: 3,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=four-k3] must not throw');
      assert.strictEqual(output!.totalIn, 200, '[cell=3, scenario=four-k3] total in');
      assert.strictEqual(output!.totalOut, 200, '[cell=3, scenario=four-k3] total out matches');
    },
  },
  {
    name: 'k=1 (maximum merge) preserves total weight',
    kind: 'happy',
    input: {
      colors: [
        rgb(0.1, 0.1, 0.1, 10),
        rgb(0.9, 0.1, 0.1, 30),
        rgb(0.1, 0.9, 0.1, 60),
      ],
      k: 1,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=max-merge] must not throw');
      assert.strictEqual(output!.totalIn, 100, '[cell=3, scenario=max-merge] total in');
      assert.strictEqual(output!.totalOut, 100, '[cell=3, scenario=max-merge] total out matches');
    },
  },
  {
    name: 'k = n (no reduction) preserves total weight',
    kind: 'edge',
    input: {
      colors: [
        rgb(0.1, 0.2, 0.3, 7),
        rgb(0.4, 0.5, 0.6, 13),
      ],
      k: 2,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=no-reduction] must not throw');
      assert.strictEqual(output!.totalIn, 20, '[cell=3, scenario=no-reduction] total in');
      assert.strictEqual(output!.totalOut, 20, '[cell=3, scenario=no-reduction] total out matches');
    },
  },
];

new ScenarioRunner<Cell3Input, Cell3Output>(
  'ClusterMedianCutWeighted :: cell-3 :: weight-invariant',
  (input) => {
    const results = clusterMedianCutWeighted.apply(input.colors, input.k);
    const totalIn  = input.colors.reduce((s, r) => s + (r.hints?.weight ?? 1), 0);
    const totalOut = results.reduce((s, r) => s + (r.hints?.weight ?? 0), 0);
    return { totalIn, totalOut };
  },
).run(cell3Scenarios);

// ---------------------------------------------------------------------------
// Cell 4 — absent weight treated as 1
//
// Records with no hints.weight must be treated as weight=1:
//   - output weight equals count of weight-less inputs
//   - weight-bearing and weight-less records can coexist; totals are correct
// ---------------------------------------------------------------------------

interface Cell4Input {
  readonly colors: readonly ColorRecordInterface[];
  readonly k: number;
}
interface Cell4Output {
  readonly totalOut: number;
  readonly expectedTotal: number;
}

const cell4Scenarios: readonly ScenarioInterface<Cell4Input, Cell4Output>[] = [
  {
    name: 'two weight-less records → total weight = 2',
    kind: 'happy',
    input: {
      colors: [
        colorRecordFactory.fromRgb(0.1, 0.1, 0.1),
        colorRecordFactory.fromRgb(0.9, 0.9, 0.9),
      ],
      k: 2,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=no-weight] must not throw');
      assert.strictEqual(output!.totalOut, 2, '[cell=4, scenario=no-weight] total = count when no weight declared');
    },
  },
  {
    name: 'single weight-less record → total weight = 1',
    kind: 'edge',
    input: {
      colors: [colorRecordFactory.fromHex('#3b82f6')],
      k: 1,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=single-no-weight] must not throw');
      assert.strictEqual(output!.totalOut, 1, '[cell=4, scenario=single-no-weight] absent weight treated as 1');
    },
  },
  {
    name: 'mixed weight-bearing and weight-less: totals add correctly',
    kind: 'edge',
    input: {
      colors: [
        colorRecordFactory.fromRgb(0.1, 0.1, 0.1), // weight=1 (absent)
        colorRecordFactory.fromRgb(0.9, 0.1, 0.1, 1, 'rgb', { 'weight': 9 }),
      ],
      k: 2,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=mixed-weight] must not throw');
      assert.strictEqual(output!.expectedTotal, 10, '[cell=4, scenario=mixed-weight] expected total');
      assert.strictEqual(output!.totalOut, 10, '[cell=4, scenario=mixed-weight] total matches 1+9');
    },
  },
];

new ScenarioRunner<Cell4Input, Cell4Output>(
  'ClusterMedianCutWeighted :: cell-4 :: default-weight',
  (input) => {
    const results = clusterMedianCutWeighted.apply(input.colors, input.k);
    const totalOut = results.reduce((s, r) => s + (r.hints?.weight ?? 0), 0);
    const expectedTotal = input.colors.reduce((s, r) => s + (r.hints?.weight ?? 1), 0);
    return { totalOut, expectedTotal };
  },
).run(cell4Scenarios);
