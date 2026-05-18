/**
 * ColorRecordShape — scenario-matrix suite.
 *
 * Subject: `ColorRecordInterface` monomorphic hidden-class discipline.
 *
 * Every `ColorRecordInterface` allocation MUST produce a record with the
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
 * Canonical order: oklch · rgb · hex · alpha · sourceFormat · displayP3 · hints
 */

import type {
  ColorRecordInterface,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { Engine }            from '@studnicky/iridis';
import { test }              from 'node:test';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import { coreTasks }          from '@studnicky/iridis/tasks';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const CANONICAL_KEYS: readonly string[] = [
  'oklch',
  'rgb',
  'hex',
  'alpha',
  'sourceFormat',
  'displayP3',
  'hints',
];

function keysOf(record: ColorRecordInterface): readonly string[] {
  return Object.keys(record);
}

function makeEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  return engine;
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

interface Cell1Input {
  readonly label:  string;
  readonly record: ColorRecordInterface;
}
interface Cell1Output {
  readonly actual:    readonly string[];
  readonly label:     string;
}

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    name: 'fromOklch basic produces canonical key order',
    kind: 'happy',
    input: { label: 'fromOklch', record: colorRecordFactory.fromOklch(0.5, 0.1, 200) },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromOklch] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromOklch] key order: ${output!.label}`);
    },
  },
  {
    name: 'fromOklch with hints produces canonical key order',
    kind: 'happy',
    input: {
      label:  'fromOklch+hints',
      record: colorRecordFactory.fromOklch(0.5, 0.1, 200, 1, 'oklch', { 'role': 'accent' }),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromOklch-hints] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromOklch-hints] key order: ${output!.label}`);
    },
  },
  {
    name: 'fromRgb basic produces canonical key order',
    kind: 'happy',
    input: { label: 'fromRgb', record: colorRecordFactory.fromRgb(0.3, 0.6, 0.9) },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromRgb] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromRgb] key order: ${output!.label}`);
    },
  },
  {
    name: 'fromRgb with sourceFormat=lab produces canonical key order',
    kind: 'happy',
    input: { label: 'fromRgb+lab', record: colorRecordFactory.fromRgb(0.3, 0.6, 0.9, 1, 'lab') },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromRgb-lab] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromRgb-lab] key order: ${output!.label}`);
    },
  },
  {
    name: 'fromHex 6-digit produces canonical key order',
    kind: 'happy',
    input: { label: 'fromHex-6', record: colorRecordFactory.fromHex('#3b82f6') },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromHex-6] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromHex-6] key order: ${output!.label}`);
    },
  },
  {
    name: 'fromHex 8-digit with embedded alpha produces canonical key order',
    kind: 'happy',
    input: { label: 'fromHex-8', record: colorRecordFactory.fromHex('#3b82f680') },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromHex-8] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromHex-8] key order: ${output!.label}`);
    },
  },
  {
    name: 'fromHex with alpha override produces canonical key order',
    kind: 'happy',
    input: { label: 'fromHex+alpha', record: colorRecordFactory.fromHex('#3b82f6', 0.5) },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromHex-alpha] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromHex-alpha] key order: ${output!.label}`);
    },
  },
  {
    name: 'fromHex with sourceFormat=named produces canonical key order',
    kind: 'happy',
    input: { label: 'fromHex+named', record: colorRecordFactory.fromHex('#ff0000', undefined, 'named') },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromHex-named] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromHex-named] key order: ${output!.label}`);
    },
  },
  {
    name: 'fromHsl produces canonical key order',
    kind: 'happy',
    input: { label: 'fromHsl', record: colorRecordFactory.fromHsl(120, 0.5, 0.5) },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromHsl] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromHsl] key order: ${output!.label}`);
    },
  },
  {
    name: 'fromOklch hue=0 (achromatic boundary) produces canonical key order',
    kind: 'edge',
    input: { label: 'fromOklch-hue0', record: colorRecordFactory.fromOklch(0.5, 0.0, 0) },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromOklch-hue0] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromOklch-hue0] key order: ${output!.label}`);
    },
  },
  {
    name: 'fromOklch hue=360 (upper hue boundary) produces canonical key order',
    kind: 'edge',
    input: { label: 'fromOklch-hue360', record: colorRecordFactory.fromOklch(0.5, 0.1, 360) },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=fromOklch-hue360] must not throw');
      assert.deepStrictEqual(output!.actual, CANONICAL_KEYS, `[cell=1, scenario=fromOklch-hue360] key order: ${output!.label}`);
    },
  },
];

new ScenarioRunner<Cell1Input, Cell1Output>(
  'ColorRecordShape :: cell-1 :: factory',
  (input) => ({
    actual: keysOf(input.record),
    label:  input.label,
  }),
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — intake task key order
//
// Each intake task drives a full Engine.run and the resulting state.colors
// records must carry the canonical key order. Covers every registered intake.
// ---------------------------------------------------------------------------

interface Cell2Input {
  readonly pipeline: readonly string[];
  readonly input:    InputInterface;
  readonly label:    string;
}
interface Cell2Output {
  readonly records: readonly ColorRecordInterface[];
  readonly label:   string;
}

const cell2Scenarios: readonly ScenarioInterface<Cell2Input, Cell2Output>[] = [
  {
    name: 'intake:hex emits canonical key order',
    kind: 'happy',
    input: { pipeline: ['intake:hex'], input: { 'colors': ['#3b82f6'] }, label: 'intake:hex' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-hex] must not throw');
      assert.strictEqual(output!.records.length, 1, '[cell=2, scenario=intake-hex] one record');
      assert.deepStrictEqual(keysOf(output!.records[0]!), CANONICAL_KEYS, `[cell=2, scenario=intake-hex] key order`);
    },
  },
  {
    name: 'intake:hex with 8-digit alpha emits canonical key order',
    kind: 'happy',
    input: { pipeline: ['intake:hex'], input: { 'colors': ['#3b82f680'] }, label: 'intake:hex-alpha' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-hex-alpha] must not throw');
      assert.deepStrictEqual(keysOf(output!.records[0]!), CANONICAL_KEYS, `[cell=2, scenario=intake-hex-alpha] key order`);
    },
  },
  {
    name: 'intake:rgb emits canonical key order',
    kind: 'happy',
    input: {
      pipeline: ['intake:rgb'],
      input:    { 'colors': [{ 'r': 100, 'g': 150, 'b': 200 }] },
      label:    'intake:rgb',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-rgb] must not throw');
      assert.deepStrictEqual(keysOf(output!.records[0]!), CANONICAL_KEYS, `[cell=2, scenario=intake-rgb] key order`);
    },
  },
  {
    name: 'intake:hsl emits canonical key order',
    kind: 'happy',
    input: {
      pipeline: ['intake:hsl'],
      input:    { 'colors': [{ 'h': 200, 's': 0.5, 'l': 0.5 }] },
      label:    'intake:hsl',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-hsl] must not throw');
      assert.deepStrictEqual(keysOf(output!.records[0]!), CANONICAL_KEYS, `[cell=2, scenario=intake-hsl] key order`);
    },
  },
  {
    name: 'intake:oklch emits canonical key order',
    kind: 'happy',
    input: {
      pipeline: ['intake:oklch'],
      input:    { 'colors': [{ 'l': 0.6, 'c': 0.15, 'h': 250 }] },
      label:    'intake:oklch',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-oklch] must not throw');
      assert.deepStrictEqual(keysOf(output!.records[0]!), CANONICAL_KEYS, `[cell=2, scenario=intake-oklch] key order`);
    },
  },
  {
    name: 'intake:lab emits canonical key order',
    kind: 'happy',
    input: {
      pipeline: ['intake:lab'],
      input:    { 'colors': [{ 'l': 50, 'a': 20, 'b': -30 }] },
      label:    'intake:lab',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-lab] must not throw');
      assert.deepStrictEqual(keysOf(output!.records[0]!), CANONICAL_KEYS, `[cell=2, scenario=intake-lab] key order`);
    },
  },
  {
    name: 'intake:named emits canonical key order',
    kind: 'happy',
    input: { pipeline: ['intake:named'], input: { 'colors': ['rebeccapurple'] }, label: 'intake:named' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-named] must not throw');
      assert.deepStrictEqual(keysOf(output!.records[0]!), CANONICAL_KEYS, `[cell=2, scenario=intake-named] key order`);
    },
  },
  {
    name: 'intake:any mixed input emits canonical key order for all records',
    kind: 'happy',
    input: {
      pipeline: ['intake:any'],
      input:    { 'colors': ['#3b82f6', { 'l': 0.6, 'c': 0.15, 'h': 250 }, 'rebeccapurple'] },
      label:    'intake:any',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-any] must not throw');
      assert.ok(output!.records.length >= 3, `[cell=2, scenario=intake-any] expected ≥3 records, got ${output!.records.length}`);
      for (let i = 0; i < output!.records.length; i++) {
        assert.deepStrictEqual(keysOf(output!.records[i]!), CANONICAL_KEYS, `[cell=2, scenario=intake-any] record[${i}] key order`);
      }
    },
  },
  {
    name: 'intake:imagePixels two pixels emit canonical key order',
    kind: 'edge',
    input: {
      pipeline: ['intake:imagePixels'],
      input:    { 'colors': [{ 'data': new Uint8ClampedArray([255, 0, 0, 255, 0, 128, 255, 255]), 'width': 2, 'height': 1 }] },
      label:    'intake:imagePixels',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=intake-imagePixels] must not throw');
      assert.strictEqual(output!.records.length, 2, '[cell=2, scenario=intake-imagePixels] two records');
      assert.deepStrictEqual(keysOf(output!.records[0]!), CANONICAL_KEYS, `[cell=2, scenario=intake-imagePixels] record[0] key order`);
      assert.deepStrictEqual(keysOf(output!.records[1]!), CANONICAL_KEYS, `[cell=2, scenario=intake-imagePixels] record[1] key order`);
    },
  },
];

new ScenarioRunner<Cell2Input, Cell2Output>(
  'ColorRecordShape :: cell-2 :: intake',
  async (input) => {
    const engine = makeEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run(input.input);
    return { records: state.colors, label: input.label };
  },
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — clamp:oklch preserves canonical key order
//
// When clamp:oklch rebuilds a record (out-of-range L or C) the rebuilt
// record must carry the canonical key order, sourceFormat, and hints.
// ---------------------------------------------------------------------------

interface Cell3Input {
  readonly label:    string;
  readonly pipeline: readonly string[];
  readonly input:    InputInterface;
  readonly seedHook: boolean;
  readonly hinted:   ColorRecordInterface | null;
}
interface Cell3Output {
  readonly record:   ColorRecordInterface;
  readonly label:    string;
}

const cell3Scenarios: readonly ScenarioInterface<Cell3Input, Cell3Output>[] = [
  {
    name: 'clamp:oklch via intake:hex preserves canonical key order',
    kind: 'happy',
    input: {
      label:     'clamp:oklch-pre-hint',
      pipeline:  ['intake:hex', 'clamp:oklch'],
      input: {
        'colors': ['#3b82f6'],
        'roles': {
          'name': 'tight-blue',
          'roles': [{ 'name': 'background', 'lightnessRange': [0.50, 0.60], 'chromaRange': [0.00, 0.02] }],
        },
      },
      seedHook:  false,
      hinted:    null,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=clamp-hex] must not throw');
      assert.deepStrictEqual(keysOf(output!.record), CANONICAL_KEYS, `[cell=3, scenario=clamp-hex] key order: ${output!.label}`);
    },
  },
  {
    name: 'clamp:oklch with role-hinted color preserves canonical key order, sourceFormat, and hints',
    kind: 'happy',
    input: {
      label:    'clamp:oklch+hint',
      pipeline: ['clamp:oklch'],
      input: {
        'colors': [],
        'roles': {
          'name': 'tight-blue',
          'roles': [{ 'name': 'background', 'required': true, 'lightnessRange': [0.50, 0.60], 'chromaRange': [0.00, 0.02] }],
        },
      },
      seedHook: true,
      hinted:   colorRecordFactory.fromHex('#3b82f6', undefined, 'hex', { 'role': 'background' }),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=clamp-hinted] must not throw');
      assert.deepStrictEqual(keysOf(output!.record), CANONICAL_KEYS, `[cell=3, scenario=clamp-hinted] key order`);
      assert.ok(output!.record.oklch.c <= 0.02, `[cell=3, scenario=clamp-hinted] clamp fired: C=${output!.record.oklch.c}`);
      assert.strictEqual(output!.record.hints?.role, 'background', '[cell=3, scenario=clamp-hinted] role hint preserved');
      assert.strictEqual(output!.record.sourceFormat, 'hex', '[cell=3, scenario=clamp-hinted] sourceFormat preserved');
    },
  },
];

new ScenarioRunner<Cell3Input, Cell3Output>(
  'ColorRecordShape :: cell-3 :: clamp',
  async (input) => {
    const engine = makeEngine();

    if (input.seedHook && input.hinted !== null) {
      const hinted = input.hinted;
      const seed: TaskInterface = {
        'name': 'seed:hinted',
        'manifest': { 'name': 'seed:hinted', 'phase': 'onRunStart' },
        run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
          state.colors.push(hinted);
        },
      };
      engine.tasks.hook('onRunStart', seed);
    }

    engine.pipeline(input.pipeline);
    const state = await engine.run(input.input);
    return { record: state.colors[0]!, label: input.label };
  },
).run(cell3Scenarios);

// ---------------------------------------------------------------------------
// Golden fixture — cross-allocation key stability
//
// All factory paths must produce identical Object.keys arrays. This test is
// table-incompatible because it asserts pairwise equality across all records
// simultaneously — a single cross-record invariant, not per-record assertions.
// ---------------------------------------------------------------------------

test('ColorRecordShape :: cell-4 :: stability :: every factory path returns identical key sets', () => {
  const records: readonly ColorRecordInterface[] = [
    colorRecordFactory.fromOklch(0.5, 0.1, 200),
    colorRecordFactory.fromOklch(0.5, 0.1, 200, 1, 'oklch', { 'role': 'r' }),
    colorRecordFactory.fromRgb(0.3, 0.6, 0.9),
    colorRecordFactory.fromRgb(0.3, 0.6, 0.9, 1, 'lab'),
    colorRecordFactory.fromHex('#abcdef'),
    colorRecordFactory.fromHex('#abcdef80'),
    colorRecordFactory.fromHex('#abcdef', 0.5),
    colorRecordFactory.fromHex('#abcdef', undefined, 'named'),
    colorRecordFactory.fromHsl(0, 1, 0.5),
  ];

  const reference = keysOf(records[0]!).join(',');
  for (let i = 1; i < records.length; i++) {
    const actual = keysOf(records[i]!).join(',');
    assert.strictEqual(
      actual,
      reference,
      `[cell=4, scenario=stability] record[${i}] key order diverged: expected ${reference}, got ${actual}`,
    );
  }
});
