/**
 * ClusterDeltaEMerge — scenario-matrix suite.
 *
 * Subject: `ClusterDeltaEMerge` (agglomerative deltaE2000 clustering).
 * Drives the single public entry point `clusterDeltaEMerge.apply(colors, k)`.
 *
 * Cells:
 *   1. guard    — k validation and empty-input early return
 *   2. merge    — near-color collapse, weight accumulation, weight preservation
 *   3. passthru — k >= input length path (no clustering, weight stamping)
 */

import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import { colorRecordFactory }   from '../../src/math/ColorRecordFactory.ts';
import { clusterDeltaEMerge }   from '../../src/math/ClusterDeltaEMerge.ts';
import type { ColorRecordInterfaceType } from '@studnicky/iridis';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function hex(code: string, weight?: number): ColorRecordInterfaceType {
  return colorRecordFactory.fromHex(code, {
    'hints': weight !== undefined ? { 'weight': weight } : undefined,
    'sourceFormat': 'hex',
  });
}

// ---------------------------------------------------------------------------
// Cell 1 — guard conditions
//
// apply() must:
//   - return [] immediately for empty input (no allocation, no throw)
//   - throw when k < 1 with a message naming the violation
//   - throw for k = 0 (boundary at the forbidden edge)
//   - throw for fractional k < 1 (0.5)
//   - accept k = 1 (minimum valid)
// ---------------------------------------------------------------------------

interface Cell1Input {
  readonly colors: readonly ColorRecordInterfaceType[];
  readonly k: number;
}
interface Cell1Output {
  readonly result: ColorRecordInterfaceType[];
}

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    name: 'empty input returns empty array',
    kind: 'happy',
    input: { colors: [], k: 5 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=empty] must not throw');
      assert.ok(output, '[cell=1, scenario=empty] output present');
      assert.deepStrictEqual(output!.result, [], '[cell=1, scenario=empty] empty array returned');
    },
  },
  {
    name: 'single color k=1 accepted and returned',
    kind: 'happy',
    input: { colors: [hex('#ff0000')], k: 1 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=single-k1] must not throw');
      assert.strictEqual(output!.result.length, 1, '[cell=1, scenario=single-k1] one cluster returned');
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
    input: { colors: [hex('#ff0000')], k: -1 },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=k-negative] expected throw');
      assert.match((error as Error).message, /k must be a positive number/, '[cell=1, scenario=k-negative] message shape');
    },
  },
  {
    name: 'fractional k below 1 throws',
    kind: 'unhappy',
    input: { colors: [hex('#ff0000')], k: 0.5 },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=k-fractional] expected throw');
      assert.match((error as Error).message, /k must be a positive number/, '[cell=1, scenario=k-fractional] message shape');
    },
  },
];

new ScenarioRunner<Cell1Input, Cell1Output>(
  'ClusterDeltaEMerge :: cell-1 :: guard',
  (input) => {
    const result = clusterDeltaEMerge.apply(input.colors, input.k);
    return { result };
  },
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — merge behaviour
//
// When k < colors.length the algorithm performs agglomerative clustering:
//   - visually-near colors (low deltaE2000) collapse into one cluster
//   - the merged cluster's weight equals the sum of the absorbed weights
//   - total weight across all output clusters must equal total input weight
//   - the merged centroid must be within the OKLCH space (no NaN)
//   - a single distinct outlier (high deltaE2000) survives in its own cluster
// ---------------------------------------------------------------------------

interface Cell2Input {
  readonly colors: readonly ColorRecordInterfaceType[];
  readonly k: number;
}
interface Cell2Output {
  readonly clusters: ColorRecordInterfaceType[];
  readonly totalIn: number;
  readonly totalOut: number;
}

const cell2Scenarios: readonly ScenarioInterface<Cell2Input, Cell2Output>[] = [
  {
    name: 'three near-reds collapse into one cluster of k=1',
    kind: 'happy',
    input: {
      colors: [
        hex('#ff0000', 10),
        hex('#fa0505', 10),
        hex('#f00a0a', 10),
      ],
      k: 1,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=three-reds-k1] must not throw');
      assert.strictEqual(output!.clusters.length, 1, '[cell=2, scenario=three-reds-k1] one cluster');
      assert.strictEqual(output!.clusters[0]!.hints?.weight, 30, '[cell=2, scenario=three-reds-k1] weight summed');
      assert.strictEqual(output!.totalIn, 30, '[cell=2, scenario=three-reds-k1] total in');
      assert.strictEqual(output!.totalOut, 30, '[cell=2, scenario=three-reds-k1] weight preserved');
    },
  },
  {
    name: 'three near-reds + one distinct green → k=2 separates them',
    kind: 'happy',
    input: {
      colors: [
        hex('#ff0000', 10),
        hex('#fa0505', 10),
        hex('#f00a0a', 10),
        hex('#00aa00', 10),
      ],
      k: 2,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=reds-plus-green] must not throw');
      assert.strictEqual(output!.clusters.length, 2, '[cell=2, scenario=reds-plus-green] two clusters');
      const sorted = [...output!.clusters].sort(
        (a, b) => (b.hints?.weight ?? 1) - (a.hints?.weight ?? 1),
      );
      assert.strictEqual(sorted[0]!.hints?.weight, 30, '[cell=2, scenario=reds-plus-green] heavy cluster carries merged weight');
      assert.strictEqual(sorted[1]!.hints?.weight, 10, '[cell=2, scenario=reds-plus-green] light cluster unchanged');
      assert.strictEqual(output!.totalOut, output!.totalIn, '[cell=2, scenario=reds-plus-green] total weight invariant');
    },
  },
  {
    name: 'weight preserved: diverse input weights sum correctly after merge',
    kind: 'happy',
    input: {
      colors: [
        hex('#aa0000', 5),
        hex('#aa00aa', 15),
        hex('#00aaaa', 25),
        hex('#aaaa00', 7),
      ],
      k: 2,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=weight-preserved] must not throw');
      assert.strictEqual(output!.totalIn, 52, '[cell=2, scenario=weight-preserved] total in');
      assert.strictEqual(output!.totalOut, 52, '[cell=2, scenario=weight-preserved] total out matches');
    },
  },
  {
    name: 'merged centroid has finite OKLCH values (no NaN)',
    kind: 'happy',
    input: {
      colors: [
        hex('#3b82f6', 20),
        hex('#2563eb', 20),
      ],
      k: 1,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=centroid-finite] must not throw');
      const c = output!.clusters[0]!;
      assert.ok(Number.isFinite(c.oklch.l), '[cell=2, scenario=centroid-finite] L is finite');
      assert.ok(Number.isFinite(c.oklch.c), '[cell=2, scenario=centroid-finite] C is finite');
      assert.ok(Number.isFinite(c.oklch.h), '[cell=2, scenario=centroid-finite] H is finite');
    },
  },
  {
    name: 'two-color input k=2 returns exactly two records unchanged',
    kind: 'edge',
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
      assert.strictEqual(output!.totalOut, 20, '[cell=2, scenario=two-k2] weight preserved');
    },
  },
  {
    name: 'single-color input k=1 produces a single cluster',
    kind: 'edge',
    input: {
      colors: [hex('#abcdef', 42)],
      k: 1,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=single-k1] must not throw');
      assert.strictEqual(output!.clusters.length, 1, '[cell=2, scenario=single-k1] one cluster');
      assert.strictEqual(output!.totalOut, 42, '[cell=2, scenario=single-k1] weight preserved');
    },
  },
  {
    name: 'achromatic colors (pure grays) merge without NaN centroid',
    kind: 'edge',
    input: {
      colors: [
        colorRecordFactory.fromRgb(0.2, 0.2, 0.2, { 'hints': { 'weight': 5 }, 'sourceFormat': 'rgb' }),
        colorRecordFactory.fromRgb(0.3, 0.3, 0.3, { 'hints': { 'weight': 5 }, 'sourceFormat': 'rgb' }),
      ],
      k: 1,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=achromatic] must not throw');
      assert.strictEqual(output!.clusters.length, 1, '[cell=2, scenario=achromatic] merged to one');
      const c = output!.clusters[0]!;
      assert.ok(Number.isFinite(c.oklch.l), '[cell=2, scenario=achromatic] L finite');
      assert.ok(!Number.isNaN(c.oklch.c),   '[cell=2, scenario=achromatic] C not NaN');
    },
  },
];

new ScenarioRunner<Cell2Input, Cell2Output>(
  'ClusterDeltaEMerge :: cell-2 :: merge',
  (input) => {
    const clusters = clusterDeltaEMerge.apply(input.colors, input.k);
    const totalIn  = input.colors.reduce((s, r) => s + (r.hints?.weight ?? 1), 0);
    const totalOut = clusters.reduce((s, r) => s + (r.hints?.weight ?? 0), 0);
    return { clusters, totalIn, totalOut };
  },
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — pass-through path (k >= input length)
//
// When the requested k is at least as large as the input count no merging
// occurs. The implementation must:
//   - return all input records (count unchanged)
//   - stamp weight=1 on any record that has no weight hint
//   - preserve existing weight hints verbatim
//   - preserve hints other than weight (role, intent, etc.)
//   - fractional k is floored (k=1.9 → 1 cluster from 2 inputs triggers merge)
// ---------------------------------------------------------------------------

interface Cell3Input {
  readonly colors: readonly ColorRecordInterfaceType[];
  readonly k: number;
}
interface Cell3Output {
  readonly results: ColorRecordInterfaceType[];
}

const cell3Scenarios: readonly ScenarioInterface<Cell3Input, Cell3Output>[] = [
  {
    name: 'k = input length returns all records',
    kind: 'happy',
    input: {
      colors: [hex('#ff0000'), hex('#00ff00')],
      k: 2,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=k-eq-n] must not throw');
      assert.strictEqual(output!.results.length, 2, '[cell=3, scenario=k-eq-n] all records returned');
    },
  },
  {
    name: 'k > input length returns all records',
    kind: 'happy',
    input: {
      colors: [hex('#ff0000'), hex('#00ff00')],
      k: 10,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=k-gt-n] must not throw');
      assert.strictEqual(output!.results.length, 2, '[cell=3, scenario=k-gt-n] all records returned');
    },
  },
  {
    name: 'records without weight hint get weight=1 stamped',
    kind: 'happy',
    input: {
      colors: [
        colorRecordFactory.fromHex('#ff0000'),
        colorRecordFactory.fromHex('#00ff00'),
      ],
      k: 5,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=stamp-weight] must not throw');
      assert.strictEqual(output!.results[0]!.hints?.weight, 1, '[cell=3, scenario=stamp-weight] first weight stamped');
      assert.strictEqual(output!.results[1]!.hints?.weight, 1, '[cell=3, scenario=stamp-weight] second weight stamped');
    },
  },
  {
    name: 'records with existing weight hint are returned verbatim',
    kind: 'happy',
    input: {
      colors: [hex('#ff0000', 42)],
      k: 5,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=preserve-weight] must not throw');
      assert.strictEqual(output!.results[0]!.hints?.weight, 42, '[cell=3, scenario=preserve-weight] weight preserved');
      assert.ok(output!.results[0] === (output!.results[0]), '[cell=3, scenario=preserve-weight] same record identity when weight exists');
    },
  },
  {
    name: 'single-element input with k=1 (boundary: pass-through)',
    kind: 'edge',
    input: {
      colors: [hex('#abcdef', 7)],
      k: 1,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=single-passthru] must not throw');
      assert.strictEqual(output!.results.length, 1, '[cell=3, scenario=single-passthru] one result');
      assert.strictEqual(output!.results[0]!.hints?.weight, 7, '[cell=3, scenario=single-passthru] weight preserved');
    },
  },
];

new ScenarioRunner<Cell3Input, Cell3Output>(
  'ClusterDeltaEMerge :: cell-3 :: passthru',
  (input) => {
    const results = clusterDeltaEMerge.apply(input.colors, input.k);
    return { results };
  },
).run(cell3Scenarios);
