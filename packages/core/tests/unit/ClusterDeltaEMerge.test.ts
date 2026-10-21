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

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';
import type { ColorRecordInterfaceTypeEntity } from '../../src/entities/ColorRecordInterfaceTypeEntity.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { ColorHintsInterfaceTypeEntity } from '../../src/entities/ColorHintsInterfaceTypeEntity.ts';
import { clusterDeltaEMerge }   from '../../src/math/ClusterDeltaEMerge.ts';
import { colorRecordFactory }   from '../../src/math/ColorRecordFactory.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestClusterFixture {
  static hex(code: string, weight?: number): ColorRecordInterfaceTypeEntity.Type {
    const hints = weight === undefined
      ? undefined
      : ColorHintsInterfaceTypeEntity.create({ 'weight': weight });
    const result = colorRecordFactory.fromHex(code, {
      ...(hints === undefined ? {} : { 'hints': hints }),
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
//   - throw when k < 1 with a message naming the violation
//   - throw for k = 0 (boundary at the forbidden edge)
//   - throw for fractional k < 1 (0.5)
//   - accept k = 1 (minimum valid)
// ---------------------------------------------------------------------------

interface Cell1InputInterface {
  readonly 'colors': readonly ColorRecordInterfaceTypeEntity.Type[];
  readonly 'k': number;
}

interface Cell1OutputInterface {
  readonly 'result': ColorRecordInterfaceTypeEntity.Type[];
}

interface Cell2InputInterface {
  readonly 'colors': readonly ColorRecordInterfaceTypeEntity.Type[];
  readonly 'k': number;
}

interface Cell2OutputInterface {
  readonly 'clusters': ColorRecordInterfaceTypeEntity.Type[];
  readonly 'totalIn': number;
  readonly 'totalOut': number;
}

interface Cell3InputInterface {
  readonly 'colors': readonly ColorRecordInterfaceTypeEntity.Type[];
  readonly 'k': number;
}

interface Cell3OutputInterface {
  readonly 'original': ColorRecordInterfaceTypeEntity.Type | undefined;
  readonly 'results': ColorRecordInterfaceTypeEntity.Type[];
}

class ClusterDeltaEMergeScenarios {
  static runCell1(): void {
    const cell1Scenarios: readonly ScenarioInterface<Cell1InputInterface, Cell1OutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=empty] must not throw');
          assert.ok(output !== undefined, '[cell=1, scenario=empty] output present');
          assert.deepStrictEqual(output.result, [], '[cell=1, scenario=empty] empty array returned');
        },
        'input': { 'colors': [], 'k': 5 },
        'kind': 'happy',
        'name': 'empty input returns empty array'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=single-k1] must not throw');
          assert.strictEqual(output!.result.length, 1, '[cell=1, scenario=single-k1] one cluster returned');
        },
        'input': { 'colors': [TestClusterFixture.hex('#ff0000')], 'k': 1 },
        'kind': 'happy',
        'name': 'single color k=1 accepted and returned'
      },
      {
        'assert': function(_output, error) {
          assert.ok(error instanceof Error, '[cell=1, scenario=k-zero] expected throw');
          assert.ok((error).message.includes('k must be a positive number'), '[cell=1, scenario=k-zero] message shape');
        },
        'input': { 'colors': [TestClusterFixture.hex('#ff0000')], 'k': 0 },
        'kind': 'unhappy',
        'name': 'k = 0 throws with message naming the constraint'
      },
      {
        'assert': function(_output, error) {
          assert.ok(error instanceof Error, '[cell=1, scenario=k-negative] expected throw');
          assert.ok((error).message.includes('k must be a positive number'), '[cell=1, scenario=k-negative] message shape');
        },
        'input': { 'colors': [TestClusterFixture.hex('#ff0000')], 'k': -1 },
        'kind': 'unhappy',
        'name': 'negative k throws'
      },
      {
        'assert': function(_output, error) {
          assert.ok(error instanceof Error, '[cell=1, scenario=k-fractional] expected throw');
          assert.ok((error).message.includes('k must be a positive number'), '[cell=1, scenario=k-fractional] message shape');
        },
        'input': { 'colors': [TestClusterFixture.hex('#ff0000')], 'k': 0.5 },
        'kind': 'unhappy',
        'name': 'fractional k below 1 throws'
      }
    ];

    new ScenarioRunner<Cell1InputInterface, Cell1OutputInterface>(
      'ClusterDeltaEMerge :: cell-1 :: guard',
      (input) => {
        const result = clusterDeltaEMerge.apply(input.colors, input.k);
        const output = { 'result': result };
        return output;
      }
    ).run(cell1Scenarios);
  }

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

  static runCell2(): void {
    const cell2Scenarios: readonly ScenarioInterface<Cell2InputInterface, Cell2OutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=three-reds-k1] must not throw');
          assert.strictEqual(output!.clusters.length, 1, '[cell=2, scenario=three-reds-k1] one cluster');
          assert.strictEqual(output!.clusters.at(0)!.hints?.weight, 30, '[cell=2, scenario=three-reds-k1] weight summed');
          assert.strictEqual(output!.totalIn, 30, '[cell=2, scenario=three-reds-k1] total in');
          assert.strictEqual(output!.totalOut, 30, '[cell=2, scenario=three-reds-k1] weight preserved');
        },
        'input': {
          'colors': [
            TestClusterFixture.hex('#ff0000', 10),
            TestClusterFixture.hex('#fa0505', 10),
            TestClusterFixture.hex('#f00a0a', 10)
          ],
          'k': 1
        },
        'kind': 'happy',
        'name': 'three near-reds collapse into one cluster of k=1'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=reds-plus-green] must not throw');
          assert.strictEqual(output!.clusters.length, 2, '[cell=2, scenario=reds-plus-green] two clusters');
          const sorted = [...output!.clusters].sort(
            (a, b) => {
              const result = (b.hints?.weight ?? 1) - (a.hints?.weight ?? 1);
              return result;
            }
          );
          assert.strictEqual(sorted.at(0)!.hints?.weight, 30, '[cell=2, scenario=reds-plus-green] heavy cluster carries merged weight');
          assert.strictEqual(sorted.at(1)!.hints?.weight, 10, '[cell=2, scenario=reds-plus-green] light cluster unchanged');
          assert.strictEqual(output!.totalOut, output!.totalIn, '[cell=2, scenario=reds-plus-green] total weight invariant');
        },
        'input': {
          'colors': [
            TestClusterFixture.hex('#ff0000', 10),
            TestClusterFixture.hex('#fa0505', 10),
            TestClusterFixture.hex('#f00a0a', 10),
            TestClusterFixture.hex('#00aa00', 10)
          ],
          'k': 2
        },
        'kind': 'happy',
        'name': 'three near-reds + one distinct green → k=2 separates them'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=weight-preserved] must not throw');
          assert.strictEqual(output!.totalIn, 52, '[cell=2, scenario=weight-preserved] total in');
          assert.strictEqual(output!.totalOut, 52, '[cell=2, scenario=weight-preserved] total out matches');
        },
        'input': {
          'colors': [
            TestClusterFixture.hex('#aa0000', 5),
            TestClusterFixture.hex('#aa00aa', 15),
            TestClusterFixture.hex('#00aaaa', 25),
            TestClusterFixture.hex('#aaaa00', 7)
          ],
          'k': 2
        },
        'kind': 'happy',
        'name': 'weight preserved: diverse input weights sum correctly after merge'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=centroid-finite] must not throw');
          const c = output!.clusters.at(0)!;
          assert.ok(Number.isFinite(c.oklch.l), '[cell=2, scenario=centroid-finite] L is finite');
          assert.ok(Number.isFinite(c.oklch.c), '[cell=2, scenario=centroid-finite] C is finite');
          assert.ok(Number.isFinite(c.oklch.h), '[cell=2, scenario=centroid-finite] H is finite');
        },
        'input': {
          'colors': [
            TestClusterFixture.hex('#3b82f6', 20),
            TestClusterFixture.hex('#2563eb', 20)
          ],
          'k': 1
        },
        'kind': 'happy',
        'name': 'merged centroid has finite OKLCH values (no NaN)'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=two-k2] must not throw');
          assert.strictEqual(output!.clusters.length, 2, '[cell=2, scenario=two-k2] two clusters out');
          assert.strictEqual(output!.totalOut, 20, '[cell=2, scenario=two-k2] weight preserved');
        },
        'input': {
          'colors': [
            TestClusterFixture.hex('#ff0000', 10),
            TestClusterFixture.hex('#00ff00', 10)
          ],
          'k': 2
        },
        'kind': 'edge',
        'name': 'two-color input k=2 returns exactly two records unchanged'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=single-k1] must not throw');
          assert.strictEqual(output!.clusters.length, 1, '[cell=2, scenario=single-k1] one cluster');
          assert.strictEqual(output!.totalOut, 42, '[cell=2, scenario=single-k1] weight preserved');
        },
        'input': {
          'colors': [TestClusterFixture.hex('#abcdef', 42)],
          'k': 1
        },
        'kind': 'edge',
        'name': 'single-color input k=1 produces a single cluster'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=achromatic] must not throw');
          assert.strictEqual(output!.clusters.length, 1, '[cell=2, scenario=achromatic] merged to one');
          const c = output!.clusters.at(0)!;
          assert.ok(Number.isFinite(c.oklch.l), '[cell=2, scenario=achromatic] L finite');
          assert.ok(!Number.isNaN(c.oklch.c),   '[cell=2, scenario=achromatic] C not NaN');
        },
        'input': {
          'colors': [
            colorRecordFactory.fromRgb(0.2, 0.2, 0.2, { 'hints': ColorHintsInterfaceTypeEntity.create({ 'weight': 5 }), 'sourceFormat': 'rgb' }),
            colorRecordFactory.fromRgb(0.3, 0.3, 0.3, { 'hints': ColorHintsInterfaceTypeEntity.create({ 'weight': 5 }), 'sourceFormat': 'rgb' })
          ],
          'k': 1
        },
        'kind': 'edge',
        'name': 'achromatic colors (pure grays) merge without NaN centroid'
      }
    ];

    new ScenarioRunner<Cell2InputInterface, Cell2OutputInterface>(
      'ClusterDeltaEMerge :: cell-2 :: merge',
      (input) => {
        const clusters = clusterDeltaEMerge.apply(input.colors, input.k);
        const totalIn  = input.colors.reduce((s, r) => {
          const result = s + (r.hints?.weight ?? 1);
          return result;
        }, 0);
        const totalOut = clusters.reduce((s, r) => {
          const result = s + (r.hints?.weight ?? 0);
          return result;
        }, 0);
        const output = { 'clusters': clusters, 'totalIn': totalIn, 'totalOut': totalOut };
        return output;
      }
    ).run(cell2Scenarios);
  }

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

  static runCell3(): void {
    const cell3Scenarios: readonly ScenarioInterface<Cell3InputInterface, Cell3OutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=3, scenario=k-eq-n] must not throw');
          assert.strictEqual(output!.results.length, 2, '[cell=3, scenario=k-eq-n] all records returned');
        },
        'input': {
          'colors': [TestClusterFixture.hex('#ff0000'), TestClusterFixture.hex('#00ff00')],
          'k': 2
        },
        'kind': 'happy',
        'name': 'k = input length returns all records'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=3, scenario=k-gt-n] must not throw');
          assert.strictEqual(output!.results.length, 2, '[cell=3, scenario=k-gt-n] all records returned');
        },
        'input': {
          'colors': [TestClusterFixture.hex('#ff0000'), TestClusterFixture.hex('#00ff00')],
          'k': 10
        },
        'kind': 'happy',
        'name': 'k > input length returns all records'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=3, scenario=stamp-weight] must not throw');
          assert.strictEqual(output!.results.at(0)!.hints?.weight, 1, '[cell=3, scenario=stamp-weight] first weight stamped');
          assert.strictEqual(output!.results.at(1)!.hints?.weight, 1, '[cell=3, scenario=stamp-weight] second weight stamped');
        },
        'input': {
          'colors': [
            colorRecordFactory.fromHex('#ff0000'),
            colorRecordFactory.fromHex('#00ff00')
          ],
          'k': 5
        },
        'kind': 'happy',
        'name': 'records without weight hint get weight=1 stamped'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=3, scenario=preserve-weight] must not throw');
          assert.strictEqual(output!.results.at(0)!.hints?.weight, 42, '[cell=3, scenario=preserve-weight] weight preserved');
          assert.strictEqual(output!.results.at(0), output!.original, '[cell=3, scenario=preserve-weight] same record identity when weight exists');
        },
        'input': {
          'colors': [TestClusterFixture.hex('#ff0000', 42)],
          'k': 5
        },
        'kind': 'happy',
        'name': 'records with existing weight hint are returned verbatim'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=3, scenario=single-passthru] must not throw');
          assert.strictEqual(output!.results.length, 1, '[cell=3, scenario=single-passthru] one result');
          assert.strictEqual(output!.results.at(0)!.hints?.weight, 7, '[cell=3, scenario=single-passthru] weight preserved');
        },
        'input': {
          'colors': [TestClusterFixture.hex('#abcdef', 7)],
          'k': 1
        },
        'kind': 'edge',
        'name': 'single-element input with k=1 (boundary: pass-through)'
      }
    ];

    new ScenarioRunner<Cell3InputInterface, Cell3OutputInterface>(
      'ClusterDeltaEMerge :: cell-3 :: passthru',
      (input) => {
        const results = clusterDeltaEMerge.apply(input.colors, input.k);
        const output = { 'original': input.colors.at(0), 'results': results };
        return output;
      }
    ).run(cell3Scenarios);
  }
}

await test('ClusterDeltaEMerge behavior', () => {
  ClusterDeltaEMergeScenarios.runCell1();
  ClusterDeltaEMergeScenarios.runCell2();
  ClusterDeltaEMergeScenarios.runCell3();
});

await test('ClusterDeltaEMerge preserves first-pair order for equal-distance merges', () => {
  const clusters = clusterDeltaEMerge.apply([
    TestClusterFixture.hex('#ff0000', 2),
    TestClusterFixture.hex('#ff0000', 3),
    TestClusterFixture.hex('#0000ff', 5),
    TestClusterFixture.hex('#0000ff', 7)
  ], 2);

  assert.deepStrictEqual(
    clusters.map((cluster) => {return {
      'hex': cluster.hex,
      'oklch': cluster.oklch,
      'weight': cluster.hints?.weight
    };}),
    [
      {
        'hex': '#ff0000',
        'oklch': {
          'c': 0.2576833077361567,
          'h': 29.233885192342655,
          'l': 0.6279553606145516
        },
        'weight': 5
      },
      {
        'hex': '#0000ff',
        'oklch': {
          'c': 0.31321437166460114,
          'h': 264.05202063805496,
          'l': 0.45201371838534293
        },
        'weight': 12
      }
    ],
    'equal deltaE pairs merge in scan order with fixed weighted centroids'
  );
});

class ClusterDeltaEMergeScaleFixture {
  static colors(count: number): ColorRecordInterfaceTypeEntity.Type[] {
    let seed = 20260920;
    const next = (): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      const unit = seed / 4294967296;
      return unit;
    };
    const result = new Array<ColorRecordInterfaceTypeEntity.Type>(count);
    for (let index = 0; index < count; index++) {
      result[index] = colorRecordFactory.fromOklch(0.2 + next() * 0.7, next() * 0.3, next() * 360, {
        'alpha': 1,
        'hints': { 'weight': 1 + Math.floor(next() * 20) },
        'sourceFormat': 'oklch'
      });
    }
    return result;
  }

  static weight(colors: readonly ColorRecordInterfaceTypeEntity.Type[]): number {
    let total = 0;
    for (let index = 0; index < colors.length; index++) {
      total += colors[index]?.hints?.weight ?? 1;
    }
    return total;
  }
}

await test('ClusterDeltaEMerge reduces a histogram-sized input to k weight-preserving clusters deterministically and quickly', () => {
  const colors = ClusterDeltaEMergeScaleFixture.colors(300);
  const startedAt = performance.now();
  const first = clusterDeltaEMerge.apply(colors, 8);
  const elapsedMs = performance.now() - startedAt;
  const second = clusterDeltaEMerge.apply(colors, 8);

  assert.equal(first.length, 8);
  assert.equal(ClusterDeltaEMergeScaleFixture.weight(first), ClusterDeltaEMergeScaleFixture.weight(colors));
  assert.deepEqual(second, first);
  assert.ok(elapsedMs < 10_000, `300-colour clustering took ${elapsedMs.toFixed(0)}ms; each pair must be measured once, not once per merge`);
});
