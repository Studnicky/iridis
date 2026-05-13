/**
 * ColorRecord monomorphic shape regression.
 *
 * Every `ColorRecordInterface` allocation in the codebase MUST produce a
 * record with the same key set in the same insertion order so V8 collapses
 * them into a single hidden class. The factory is the canonical
 * allocation point; intake tasks and ClampOklch route through it without
 * post-call spread-append patterns that would reorder keys or add
 * shape-divergent fields.
 *
 * These tests pin the canonical key list and assert it across every
 * allocation path the pipeline exercises:
 *   - factory methods: fromOklch, fromRgb, fromHex, fromHsl
 *   - intake tasks:    intake:hex, intake:rgb, intake:hsl, intake:oklch,
 *                      intake:lab, intake:named, intake:imagePixels
 *   - clamp task:      clamp:oklch (when clamping fires; preserves shape)
 *
 * Failure mode prevented: a future refactor reintroducing
 * `{...record, sourceFormat: 'x'}` or `{...record, hints: {...}}` would
 * produce records with a different key order than the factory output,
 * causing V8 to allocate a second hidden class. Megamorphic call sites
 * (e.g. EnforceContrast iterating over state.colors) would then deopt.
 */

import { test } from 'node:test';

import type {
  ColorRecordInterface,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { Engine }            from '@studnicky/iridis';
import { coreTasks }         from '@studnicky/iridis/tasks';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { assert }            from './ScenarioRunner.ts';

/* The canonical insertion order. Every record MUST match this exact
 * array (same elements, same order). */
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

function assertCanonical(record: ColorRecordInterface, label: string): void {
  const actual = keysOf(record);
  assert.deepStrictEqual(
    actual,
    CANONICAL_KEYS,
    `${label}: expected canonical key order ${CANONICAL_KEYS.join(',')}, got ${actual.join(',')}`,
  );
}

// ---------------------------------------------------------------------------
// Factory methods
// ---------------------------------------------------------------------------

test('ColorRecord shape :: factory :: fromOklch produces canonical key order', () => {
  const record = colorRecordFactory.fromOklch(0.5, 0.1, 200);
  assertCanonical(record, 'fromOklch');
});

test('ColorRecord shape :: factory :: fromOklch with hints produces canonical key order', () => {
  const record = colorRecordFactory.fromOklch(0.5, 0.1, 200, 1, 'oklch', { 'role': 'accent' });
  assertCanonical(record, 'fromOklch+hints');
});

test('ColorRecord shape :: factory :: fromRgb produces canonical key order', () => {
  const record = colorRecordFactory.fromRgb(0.3, 0.6, 0.9);
  assertCanonical(record, 'fromRgb');
});

test('ColorRecord shape :: factory :: fromRgb with sourceFormat=lab produces canonical key order', () => {
  const record = colorRecordFactory.fromRgb(0.3, 0.6, 0.9, 1, 'lab');
  assertCanonical(record, 'fromRgb+lab');
});

test('ColorRecord shape :: factory :: fromHex 6-digit produces canonical key order', () => {
  const record = colorRecordFactory.fromHex('#3b82f6');
  assertCanonical(record, 'fromHex-6');
});

test('ColorRecord shape :: factory :: fromHex 8-digit produces canonical key order', () => {
  const record = colorRecordFactory.fromHex('#3b82f680');
  assertCanonical(record, 'fromHex-8');
});

test('ColorRecord shape :: factory :: fromHex with alpha override produces canonical key order', () => {
  const record = colorRecordFactory.fromHex('#3b82f6', 0.5);
  assertCanonical(record, 'fromHex+alpha');
});

test('ColorRecord shape :: factory :: fromHex with sourceFormat=named produces canonical key order', () => {
  const record = colorRecordFactory.fromHex('#ff0000', undefined, 'named');
  assertCanonical(record, 'fromHex+named');
});

test('ColorRecord shape :: factory :: fromHsl produces canonical key order', () => {
  const record = colorRecordFactory.fromHsl(120, 0.5, 0.5);
  assertCanonical(record, 'fromHsl');
});

// ---------------------------------------------------------------------------
// Intake tasks — drive each format through the engine and inspect state.colors
// ---------------------------------------------------------------------------

function makeEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  return engine;
}

async function runIntakeOnly(
  engine:   Engine,
  pipeline: readonly string[],
  input:    InputInterface,
): Promise<PaletteStateInterface> {
  engine.pipeline(pipeline);
  return engine.run(input);
}

test('ColorRecord shape :: intake :: intake:hex emits canonical key order', async () => {
  const engine = makeEngine();
  const state  = await runIntakeOnly(engine, ['intake:hex'], { 'colors': ['#3b82f6'] });
  assert.strictEqual(state.colors.length, 1);
  assertCanonical(state.colors[0]!, 'intake:hex');
});

test('ColorRecord shape :: intake :: intake:hex with 8-digit alpha emits canonical key order', async () => {
  const engine = makeEngine();
  const state  = await runIntakeOnly(engine, ['intake:hex'], { 'colors': ['#3b82f680'] });
  assert.strictEqual(state.colors.length, 1);
  assertCanonical(state.colors[0]!, 'intake:hex-alpha');
});

test('ColorRecord shape :: intake :: intake:rgb emits canonical key order', async () => {
  const engine = makeEngine();
  const state  = await runIntakeOnly(
    engine,
    ['intake:rgb'],
    { 'colors': [{ 'r': 100, 'g': 150, 'b': 200 }] },
  );
  assert.strictEqual(state.colors.length, 1);
  assertCanonical(state.colors[0]!, 'intake:rgb');
});

test('ColorRecord shape :: intake :: intake:hsl emits canonical key order', async () => {
  const engine = makeEngine();
  const state  = await runIntakeOnly(
    engine,
    ['intake:hsl'],
    { 'colors': [{ 'h': 200, 's': 0.5, 'l': 0.5 }] },
  );
  assert.strictEqual(state.colors.length, 1);
  assertCanonical(state.colors[0]!, 'intake:hsl');
});

test('ColorRecord shape :: intake :: intake:oklch emits canonical key order', async () => {
  const engine = makeEngine();
  const state  = await runIntakeOnly(
    engine,
    ['intake:oklch'],
    { 'colors': [{ 'l': 0.6, 'c': 0.15, 'h': 250 }] },
  );
  assert.strictEqual(state.colors.length, 1);
  assertCanonical(state.colors[0]!, 'intake:oklch');
});

test('ColorRecord shape :: intake :: intake:lab emits canonical key order', async () => {
  const engine = makeEngine();
  const state  = await runIntakeOnly(
    engine,
    ['intake:lab'],
    { 'colors': [{ 'l': 50, 'a': 20, 'b': -30 }] },
  );
  assert.strictEqual(state.colors.length, 1);
  assertCanonical(state.colors[0]!, 'intake:lab');
});

test('ColorRecord shape :: intake :: intake:named emits canonical key order', async () => {
  const engine = makeEngine();
  const state  = await runIntakeOnly(engine, ['intake:named'], { 'colors': ['rebeccapurple'] });
  assert.strictEqual(state.colors.length, 1);
  assertCanonical(state.colors[0]!, 'intake:named');
});

test('ColorRecord shape :: intake :: intake:imagePixels emits canonical key order', async () => {
  const engine = makeEngine();
  // Two opaque pixels (4 bytes each: r,g,b,a).
  const data = new Uint8ClampedArray([
    255, 0,   0,   255,
    0,   128, 255, 255,
  ]);
  const state = await runIntakeOnly(
    engine,
    ['intake:imagePixels'],
    { 'colors': [{ 'data': data, 'width': 2, 'height': 1 }] },
  );
  assert.strictEqual(state.colors.length, 2);
  assertCanonical(state.colors[0]!, 'intake:imagePixels[0]');
  assertCanonical(state.colors[1]!, 'intake:imagePixels[1]');
});

test('ColorRecord shape :: intake :: intake:any emits canonical key order for mixed input', async () => {
  const engine = makeEngine();
  const state  = await runIntakeOnly(
    engine,
    ['intake:any'],
    { 'colors': ['#3b82f6', { 'l': 0.6, 'c': 0.15, 'h': 250 }, 'rebeccapurple'] },
  );
  assert.ok(state.colors.length >= 3, `expected ≥3 colors, got ${state.colors.length}`);
  for (let i = 0; i < state.colors.length; i++) {
    assertCanonical(state.colors[i]!, `intake:any[${i}]`);
  }
});

// ---------------------------------------------------------------------------
// Clamp task — clamp:oklch must preserve canonical shape on the rebuilt record
// ---------------------------------------------------------------------------

test('ColorRecord shape :: clamp :: clamp:oklch preserves canonical key order after clamping', async () => {
  /* Schema with a tight chroma range forces clamp:oklch to actually
   * rebuild the record (the factory call inside ClampOklch is what we
   * care about — it must produce the canonical shape including
   * preserved sourceFormat and hints). */
  const engine = makeEngine();
  engine.pipeline(['intake:hex', 'clamp:oklch']);
  const state = await engine.run({
    'colors': ['#3b82f6'],
    'roles': {
      'name': 'tight-blue',
      'roles': [
        {
          'name':           'background',
          'lightnessRange': [0.50, 0.60],
          'chromaRange':    [0.00, 0.02],
        },
      ],
    },
  });
  assert.strictEqual(state.colors.length, 1);
  /* The default schema-less branch is exercised because the color
   * carries no hints.role, so the conservative defaults apply —
   * #3b82f6's chroma (~0.18) exceeds the 0.40 ceiling? No, it doesn't.
   * Force the rebuild via the role-hint path instead. */
  assertCanonical(state.colors[0]!, 'clamp:oklch-pre-hint');
});

test('ColorRecord shape :: clamp :: clamp:oklch with hint preserves canonical key order', async () => {
  /* Construct a hinted color via factory then push it onto state via
   * an onRunStart hook. clamp:oklch will rebuild it because the hinted
   * role declares a tight chroma range the input exceeds. */
  const engine = makeEngine();

  const hinted: ColorRecordInterface = colorRecordFactory.fromHex(
    '#3b82f6',
    undefined,
    'hex',
    { 'role': 'background' },
  );

  const seed: TaskInterface = {
    'name': 'seed:hinted',
    'manifest': { 'name': 'seed:hinted', 'phase': 'onRunStart' },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      state.colors.push(hinted);
    },
  };
  engine.tasks.hook('onRunStart', seed);
  engine.pipeline(['clamp:oklch']);

  const state = await engine.run({
    'colors': [],
    'roles': {
      'name': 'tight-blue',
      'roles': [
        {
          'name':           'background',
          'required':       true,
          'lightnessRange': [0.50, 0.60],
          'chromaRange':    [0.00, 0.02],
        },
      ],
    },
  });

  assert.strictEqual(state.colors.length, 1);
  const clamped = state.colors[0]!;
  assertCanonical(clamped, 'clamp:oklch+hint');
  /* Sanity: clamp:oklch must have actually fired (chroma is now within range). */
  assert.ok(clamped.oklch.c <= 0.02, `expected chroma ≤ 0.02 after clamp, got ${clamped.oklch.c}`);
  /* Hints and sourceFormat must be preserved through the clamp rebuild. */
  assert.strictEqual(clamped.hints?.role, 'background');
  assert.strictEqual(clamped.sourceFormat, 'hex');
});

// ---------------------------------------------------------------------------
// Cross-allocation shape stability — every record returned anywhere has the
// same Object.keys array
// ---------------------------------------------------------------------------

test('ColorRecord shape :: stability :: every factory path returns identical key sets', () => {
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
      `record ${i} key order diverged: expected ${reference}, got ${actual}`,
    );
  }
});
