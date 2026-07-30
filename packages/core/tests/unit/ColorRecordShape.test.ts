/**
 * ColorRecordShape — scenario-matrix suite.
 *
 * Subject: `ColorRecordInterfaceType` monomorphic hidden-class discipline.
 *
 * Every `ColorRecordInterfaceType` allocation MUST produce a record with the
 * same key set in the same insertion order so V8 collapses them into a
 * single hidden class. The factory is the canonical allocation point;
 * intake tasks and ClampOklch route through it.
 *
 * Cells:
 *   1. factory    — every factory method (fromOklch, fromRgb, fromHex, fromHsl)
 *                   produces canonical key order
 *   2. intake     — every intake task emits canonical key order via Engine.run
 *   3. clamp      — clamp:oklch preserves canonical key order on the rebuilt record
 *   4. stability  — all factory paths produce identical Object.keys arrays
 *
 * Canonical order: alpha · displayP3 · hex · hints · oklch · rgb · sourceFormat
 * (alphabetical — enforced automatically by the workspace's
 * perfectionist/sort-objects eslint rule, so it can never silently drift).
 */

import type {
  ColorRecordInterfaceType,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { Engine }            from '@studnicky/iridis';
import { coreTasks }          from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test }              from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const CANONICAL_KEYS: readonly string[] = [
  'alpha',
  'displayP3',
  'hex',
  'hints',
  'oklch',
  'rgb',
  'sourceFormat'
];

class TestColorRecordFixture {
  static keysOf(record: ColorRecordInterfaceType): readonly string[] {
    const result = Object.keys(record);
    return result;
  }

  static makeEngine(): Engine {
    const engine = new Engine();
    for (const task of coreTasks) {engine.tasks.register(task);}
    return engine;
  }
}

/** Task that seeds `state.colors` with a pre-built, role-hinted record before the pipeline runs. */
class TestSeedHintedTask implements TaskInterface {
  readonly 'manifest': TaskManifestInterfaceType = { 'description': undefined, 'name': 'seed:hinted', 'phase': 'onRunStart', 'reads': undefined, 'requires': undefined, 'writes': undefined };
  readonly 'name' = 'seed:hinted';

  readonly #hinted: ColorRecordInterfaceType;

  constructor(hinted: ColorRecordInterfaceType) {
    this.#hinted = hinted;
  }

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    state.colors.push(this.#hinted);
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — factory method key order
//
// Every factory method must produce the canonical key set in the canonical
// insertion order. Checked via Object.keys. Covers:
//   - fromOklch (no hints, with hints)
//   - fromRgb (no sourceFormat, with alternate sourceFormat)
//   - fromHex (6-digit, 8-digit with embedded alpha, with alpha override, with sourceFormat)
//   - fromHsl
// ---------------------------------------------------------------------------

type Cell1Output = {
  readonly 'actual':    readonly string[];
  readonly 'label':     string;
};

const cell1Scenarios: readonly ScenarioInterface<{ readonly 'label': string; readonly 'record': ColorRecordInterfaceType }, Cell1Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromOklch] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromOklch] key order: ${output!.label}`);
    },
    'input': { 'label': 'fromOklch', 'record': colorRecordFactory.fromOklch(0.5, 0.1, 200) },
    'kind': 'happy',
    'name': 'fromOklch basic produces canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromOklch-hints] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromOklch-hints] key order: ${output!.label}`);
    },
    'input': {
      'label':  'fromOklch+hints',
      'record': colorRecordFactory.fromOklch(0.5, 0.1, 200, { 'hints': { 'intent': undefined, 'role': 'accent', 'weight': undefined } })
    },
    'kind': 'happy',
    'name': 'fromOklch with hints produces canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromRgb] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromRgb] key order: ${output!.label}`);
    },
    'input': { 'label': 'fromRgb', 'record': colorRecordFactory.fromRgb(0.3, 0.6, 0.9) },
    'kind': 'happy',
    'name': 'fromRgb basic produces canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromRgb-lab] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromRgb-lab] key order: ${output!.label}`);
    },
    'input': { 'label': 'fromRgb+lab', 'record': colorRecordFactory.fromRgb(0.3, 0.6, 0.9, { 'sourceFormat': 'lab' }) },
    'kind': 'happy',
    'name': 'fromRgb with sourceFormat=lab produces canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromHex-6] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromHex-6] key order: ${output!.label}`);
    },
    'input': { 'label': 'fromHex-6', 'record': colorRecordFactory.fromHex('#3b82f6') },
    'kind': 'happy',
    'name': 'fromHex 6-digit produces canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromHex-8] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromHex-8] key order: ${output!.label}`);
    },
    'input': { 'label': 'fromHex-8', 'record': colorRecordFactory.fromHex('#3b82f680') },
    'kind': 'happy',
    'name': 'fromHex 8-digit with embedded alpha produces canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromHex-alpha] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromHex-alpha] key order: ${output!.label}`);
    },
    'input': { 'label': 'fromHex+alpha', 'record': colorRecordFactory.fromHex('#3b82f6', { 'alphaOverride': 0.5 }) },
    'kind': 'happy',
    'name': 'fromHex with alpha override produces canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromHex-named] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromHex-named] key order: ${output!.label}`);
    },
    'input': { 'label': 'fromHex+named', 'record': colorRecordFactory.fromHex('#ff0000', { 'sourceFormat': 'named' }) },
    'kind': 'happy',
    'name': 'fromHex with sourceFormat=named produces canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromHsl] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromHsl] key order: ${output!.label}`);
    },
    'input': { 'label': 'fromHsl', 'record': colorRecordFactory.fromHsl(120, 0.5, 0.5) },
    'kind': 'happy',
    'name': 'fromHsl produces canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromOklch-hue0] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromOklch-hue0] key order: ${output!.label}`);
    },
    'input': { 'label': 'fromOklch-hue0', 'record': colorRecordFactory.fromOklch(0.5, 0.0, 0) },
    'kind': 'edge',
    'name': 'fromOklch hue=0 (achromatic boundary) produces canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromOklch-hue360] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromOklch-hue360] key order: ${output!.label}`);
    },
    'input': { 'label': 'fromOklch-hue360', 'record': colorRecordFactory.fromOklch(0.5, 0.1, 360) },
    'kind': 'edge',
    'name': 'fromOklch hue=360 (upper hue boundary) produces canonical key order'
  }
];

new ScenarioRunner<{ readonly 'label': string; readonly 'record': ColorRecordInterfaceType }, Cell1Output>(
  'ColorRecordShape :: cell-1 :: factory',
  (input) => {return {
    'actual': TestColorRecordFixture.keysOf(input.record),
    'label':  input.label
  };}
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — intake task key order
//
// Each intake task drives a full Engine.run and the resulting state.colors
// records must carry the canonical key order. Covers every registered intake.
// ---------------------------------------------------------------------------

type Cell2Input = {
  readonly 'input':    InputInterface;
  readonly 'label':    string;
  readonly 'pipeline': readonly string[];
};
type Cell2Output = {
  readonly 'label':   string;
  readonly 'records': readonly ColorRecordInterfaceType[];
};

const cell2Scenarios: readonly ScenarioInterface<Cell2Input, Cell2Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-hex] must not throw');
      assert.strictEqual(output!.records.length, 1, '[cell=2, scenario=intake-hex] one record');
      const record = output!.records.at(0)!;
      assert.deepStrictEqual(TestColorRecordFixture.keysOf(record), CANONICAL_KEYS, '[cell=2, scenario=intake-hex] key order');
    },
    'input': { 'input': { 'bypass': undefined, 'colors': ['#3b82f6'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined }, 'label': 'intake:hex', 'pipeline': ['intake:hex'] },
    'kind': 'happy',
    'name': 'intake:hex emits canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-hex-alpha] must not throw');
      const record = output!.records.at(0)!;
      assert.deepStrictEqual(TestColorRecordFixture.keysOf(record), CANONICAL_KEYS, '[cell=2, scenario=intake-hex-alpha] key order');
    },
    'input': { 'input': { 'bypass': undefined, 'colors': ['#3b82f680'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined }, 'label': 'intake:hex-alpha', 'pipeline': ['intake:hex'] },
    'kind': 'happy',
    'name': 'intake:hex with 8-digit alpha emits canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-rgb] must not throw');
      const record = output!.records.at(0)!;
      assert.deepStrictEqual(TestColorRecordFixture.keysOf(record), CANONICAL_KEYS, '[cell=2, scenario=intake-rgb] key order');
    },
    'input': {
      'input':    { 'bypass': undefined, 'colors': [{ 'b': 200, 'g': 150, 'r': 100 }], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      'label':    'intake:rgb',
      'pipeline': ['intake:rgb']
    },
    'kind': 'happy',
    'name': 'intake:rgb emits canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-hsl] must not throw');
      const record = output!.records.at(0)!;
      assert.deepStrictEqual(TestColorRecordFixture.keysOf(record), CANONICAL_KEYS, '[cell=2, scenario=intake-hsl] key order');
    },
    'input': {
      'input':    { 'bypass': undefined, 'colors': [{ 'h': 200, 'l': 0.5, 's': 0.5 }], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      'label':    'intake:hsl',
      'pipeline': ['intake:hsl']
    },
    'kind': 'happy',
    'name': 'intake:hsl emits canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-oklch] must not throw');
      const record = output!.records.at(0)!;
      assert.deepStrictEqual(TestColorRecordFixture.keysOf(record), CANONICAL_KEYS, '[cell=2, scenario=intake-oklch] key order');
    },
    'input': {
      'input':    { 'bypass': undefined, 'colors': [{ 'c': 0.15, 'h': 250, 'l': 0.6 }], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      'label':    'intake:oklch',
      'pipeline': ['intake:oklch']
    },
    'kind': 'happy',
    'name': 'intake:oklch emits canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-lab] must not throw');
      const record = output!.records.at(0)!;
      assert.deepStrictEqual(TestColorRecordFixture.keysOf(record), CANONICAL_KEYS, '[cell=2, scenario=intake-lab] key order');
    },
    'input': {
      'input':    { 'bypass': undefined, 'colors': [{ 'a': 20, 'b': -30, 'l': 50 }], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      'label':    'intake:lab',
      'pipeline': ['intake:lab']
    },
    'kind': 'happy',
    'name': 'intake:lab emits canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-named] must not throw');
      const record = output!.records.at(0)!;
      assert.deepStrictEqual(TestColorRecordFixture.keysOf(record), CANONICAL_KEYS, '[cell=2, scenario=intake-named] key order');
    },
    'input': { 'input': { 'bypass': undefined, 'colors': ['rebeccapurple'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined }, 'label': 'intake:named', 'pipeline': ['intake:named'] },
    'kind': 'happy',
    'name': 'intake:named emits canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-any] must not throw');
      assert.ok(output!.records.length >= 3, `[cell=2, scenario=intake-any] expected ≥3 records, got ${output!.records.length}`);
      const recordCount = output!.records.length;
      for (let i = 0; i < recordCount; i++) {
        const record = output!.records.at(i)!;
        assert.deepStrictEqual(TestColorRecordFixture.keysOf(record), CANONICAL_KEYS, `[cell=2, scenario=intake-any] record[${i}] key order`);
      }
    },
    'input': {
      'input':    { 'bypass': undefined, 'colors': ['#3b82f6', { 'c': 0.15, 'h': 250, 'l': 0.6 }, 'rebeccapurple'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      'label':    'intake:any',
      'pipeline': ['intake:any']
    },
    'kind': 'happy',
    'name': 'intake:any mixed input emits canonical key order for all records'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-imagePixels] must not throw');
      assert.strictEqual(output!.records.length, 2, '[cell=2, scenario=intake-imagePixels] two records');
      const recordZero = output!.records.at(0)!;
      const recordOne  = output!.records.at(1)!;
      assert.deepStrictEqual(TestColorRecordFixture.keysOf(recordZero), CANONICAL_KEYS, '[cell=2, scenario=intake-imagePixels] record[0] key order');
      assert.deepStrictEqual(TestColorRecordFixture.keysOf(recordOne), CANONICAL_KEYS, '[cell=2, scenario=intake-imagePixels] record[1] key order');
    },
    'input': {
      'input':    { 'bypass': undefined, 'colors': [{ 'data': new Uint8ClampedArray([255, 0, 0, 255, 0, 128, 255, 255]), 'height': 1, 'width': 2 }], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      'label':    'intake:imagePixels',
      'pipeline': ['intake:imagePixels']
    },
    'kind': 'edge',
    'name': 'intake:imagePixels two pixels emit canonical key order'
  }
];

new ScenarioRunner<Cell2Input, Cell2Output>(
  'ColorRecordShape :: cell-2 :: intake',
  (input) => {
    const engine = TestColorRecordFixture.makeEngine();
    engine.pipeline(input.pipeline);
    const state = engine.run(input.input);
    return { 'label': input.label, 'records': state.colors };
  }
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — clamp:oklch preserves canonical key order
//
// When clamp:oklch rebuilds a record (out-of-range L or C) the rebuilt
// record must carry the canonical key order, sourceFormat, and hints.
// ---------------------------------------------------------------------------

type Cell3Input = {
  readonly 'hinted':   ColorRecordInterfaceType | null;
  readonly 'input':    InputInterface;
  readonly 'label':    string;
  readonly 'pipeline': readonly string[];
  readonly 'seedHook': boolean;
};

const cell3Scenarios: readonly ScenarioInterface<Cell3Input, { readonly 'label': string; readonly 'record': ColorRecordInterfaceType }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=clamp-hex] must not throw');
      assert.deepStrictEqual(TestColorRecordFixture.keysOf(output!.record), CANONICAL_KEYS, `[cell=3, scenario=clamp-hex] key order: ${output!.label}`);
    },
    'input': {
      'hinted':    null,
      'input': {
        'bypass': undefined,
        'colors': ['#3b82f6'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': {
          'contrastPairs': undefined,
          'description': undefined, 'name': 'tight-blue', 'roles': [{ 'chromaRange': [0.00, 0.02], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.50, 0.60], 'name': 'background', 'required': undefined }]
        }, 'runtime': undefined
      },
      'label':     'clamp:oklch-pre-hint',
      'pipeline':  ['intake:hex', 'clamp:oklch'],
      'seedHook':  false
    },
    'kind': 'happy',
    'name': 'clamp:oklch via intake:hex preserves canonical key order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=clamp-hinted] must not throw');
      assert.deepStrictEqual(TestColorRecordFixture.keysOf(output!.record), CANONICAL_KEYS, '[cell=3, scenario=clamp-hinted] key order');
      assert.ok(output!.record.oklch.c <= 0.02, `[cell=3, scenario=clamp-hinted] clamp fired: C=${output!.record.oklch.c}`);
      assert.strictEqual(output!.record.hints?.role, 'background', '[cell=3, scenario=clamp-hinted] role hint preserved');
      assert.strictEqual(output!.record.sourceFormat, 'hex', '[cell=3, scenario=clamp-hinted] sourceFormat preserved');
    },
    'input': {
      'hinted':   colorRecordFactory.fromHex('#3b82f6', { 'hints': { 'intent': undefined, 'role': 'background', 'weight': undefined }, 'sourceFormat': 'hex' }),
      'input': {
        'bypass': undefined,
        'colors': [], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': {
          'contrastPairs': undefined,
          'description': undefined, 'name': 'tight-blue', 'roles': [{ 'chromaRange': [0.00, 0.02], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.50, 0.60], 'name': 'background', 'required': true }]
        }, 'runtime': undefined
      },
      'label':    'clamp:oklch+hint',
      'pipeline': ['clamp:oklch'],
      'seedHook': true
    },
    'kind': 'happy',
    'name': 'clamp:oklch with role-hinted color preserves canonical key order, sourceFormat, and hints'
  }
];

new ScenarioRunner<Cell3Input, { readonly 'label': string; readonly 'record': ColorRecordInterfaceType }>(
  'ColorRecordShape :: cell-3 :: clamp',
  (input) => {
    const engine = TestColorRecordFixture.makeEngine();

    if (input.seedHook && input.hinted !== null) {
      engine.tasks.hook('onRunStart', new TestSeedHintedTask(input.hinted));
    }

    engine.pipeline(input.pipeline);
    const state = engine.run(input.input);
    const record = state.colors.at(0)!;
    return { 'label': input.label, 'record': record };
  }
).run(cell3Scenarios);

// ---------------------------------------------------------------------------
// Golden fixture — cross-allocation key stability
//
// All factory paths must produce identical Object.keys arrays. This test is
// table-incompatible because it asserts pairwise equality across all records
// simultaneously — a single cross-record invariant, not per-record assertions.
// ---------------------------------------------------------------------------

void test('ColorRecordShape :: cell-4 :: stability :: every factory path returns identical key sets', () => {
  const records: readonly ColorRecordInterfaceType[] = [
    colorRecordFactory.fromOklch(0.5, 0.1, 200),
    colorRecordFactory.fromOklch(0.5, 0.1, 200, { 'hints': { 'intent': undefined, 'role': 'r', 'weight': undefined } }),
    colorRecordFactory.fromRgb(0.3, 0.6, 0.9),
    colorRecordFactory.fromRgb(0.3, 0.6, 0.9, { 'sourceFormat': 'lab' }),
    colorRecordFactory.fromHex('#abcdef'),
    colorRecordFactory.fromHex('#abcdef80'),
    colorRecordFactory.fromHex('#abcdef', { 'alphaOverride': 0.5 }),
    colorRecordFactory.fromHex('#abcdef', { 'sourceFormat': 'named' }),
    colorRecordFactory.fromHsl(0, 1, 0.5)
  ];

  const reference = TestColorRecordFixture.keysOf(records.at(0)!).join(',');
  const recordCount = records.length;
  for (let i = 1; i < recordCount; i++) {
    const actual = TestColorRecordFixture.keysOf(records.at(i)!).join(',');
    assert.strictEqual(
      actual,
      reference,
      `[cell=4, scenario=stability] record[${i}] key order diverged: expected ${reference}, got ${actual}`
    );
  }
});
