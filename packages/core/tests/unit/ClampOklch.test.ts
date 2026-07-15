/**
 * ClampOklch — scenario-matrix suite.
 *
 * Subject: `clamp:oklch` pipeline task (ClampOklch).
 * Drives the task through Engine.run, seeding state.colors via an
 * onRunStart hook, then asserting the resulting state.colors[0].
 *
 * Cells:
 *   1. range-select  — roleRangeFor picks the right range for each input
 *   2. clamp-rebuild — out-of-range values are clamped and a new record allocated
 *   3. identity      — in-range values return the same record reference (no alloc)
 */

import type {
  ColorRecordInterfaceType,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { Engine }            from '@studnicky/iridis/engine';
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

function makeEngine(seed: ColorRecordInterfaceType): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  const seedTask: TaskInterface = {
    'name':     'seed:onRunStart',
    'manifest': { 'name': 'seed:onRunStart', 'phase': 'onRunStart', 'description': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      state.colors.push(seed);
    },
  };
  engine.tasks.hook('onRunStart', seedTask);
  engine.pipeline(['clamp:oklch']);
  return engine;
}

// ---------------------------------------------------------------------------
// Cell 1 — range selection (roleRangeFor)
//
// roleRangeFor determines which L/C envelope is applied to each color:
//   - no hints + no schema            → default [0.05, 0.95] × [0.00, 0.40]
//   - role hint + schema declares it  → role-specific L/C ranges
//   - role hint + role has no ranges  → falls back to defaults
//   - role hint + role not in schema  → falls back to defaults
// This cell asserts that the correct range governs the clamp outcome by
// placing in-range values against each range selector and asserting identity.
// ---------------------------------------------------------------------------

interface Cell1Input {
  readonly seed:  ColorRecordInterfaceType;
  readonly input: InputInterface;
}
interface Cell1Output {
  readonly color:     ColorRecordInterfaceType;
  readonly isSameRef: boolean;
  readonly seed:      ColorRecordInterfaceType;
}

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    name: 'no hints no schema: default range applied — in-range L+C → identity',
    kind: 'happy',
    input: {
      seed:  colorRecordFactory.fromOklch(0.5, 0.1, 200),
      input: { 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=default-in-range] must not throw');
      assert.strictEqual(output!.isSameRef, true, '[cell=1, scenario=default-in-range] identity early-return');
      assert.strictEqual(output!.color.oklch.l, 0.5, '[cell=1, scenario=default-in-range] L unchanged');
      assert.strictEqual(output!.color.oklch.c, 0.1, '[cell=1, scenario=default-in-range] C unchanged');
    },
  },
  {
    name: 'role hint + schema defines range: in-range under tight bounds → identity',
    kind: 'happy',
    input: {
      seed: colorRecordFactory.fromOklch(0.5, 0.1, 200, { 'hints': { 'role': 'accent', 'intent': undefined, 'weight': undefined } }),
      input: {
        'colors': [],
        'roles': {
          'name':  'tight-accent',
          'roles': [
            { 'name': 'accent', 'lightnessRange': [0.40, 0.60], 'chromaRange': [0.05, 0.15], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'required': undefined },
          ], 'contrastPairs': undefined, 'description': undefined,
        }, 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'runtime': undefined,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=role-in-range] must not throw');
      assert.strictEqual(output!.isSameRef, true, '[cell=1, scenario=role-in-range] role-range in-range → identity');
      assert.strictEqual(output!.color.hints?.role, 'accent', '[cell=1, scenario=role-in-range] hint preserved');
    },
  },
  {
    name: 'role hint + role in schema but no ranges → falls back to defaults → identity',
    kind: 'edge',
    input: {
      seed: colorRecordFactory.fromOklch(0.5, 0.1, 200, { 'hints': { 'role': 'mystery', 'intent': undefined, 'weight': undefined } }),
      input: {
        'colors': [],
        'roles': {
          'name':  'mystery-only',
          'roles': [{ 'name': 'mystery', 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'required': undefined }], 'contrastPairs': undefined, 'description': undefined,
        }, 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'runtime': undefined,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=no-ranges-fallback] must not throw');
      assert.strictEqual(output!.isSameRef, true, '[cell=1, scenario=no-ranges-fallback] defaults applied → identity');
      assert.strictEqual(output!.color.hints?.role, 'mystery', '[cell=1, scenario=no-ranges-fallback] hint preserved');
    },
  },
  {
    name: 'role hint pointing to an absent role → defaults apply → identity',
    kind: 'edge',
    input: {
      seed: colorRecordFactory.fromOklch(0.5, 0.1, 200, { 'hints': { 'role': 'unknown-role', 'intent': undefined, 'weight': undefined } }),
      input: {
        'colors': [],
        'roles': {
          'name':  'no-match',
          'roles': [{ 'name': 'accent', 'lightnessRange': [0.40, 0.60], 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'required': undefined }], 'contrastPairs': undefined, 'description': undefined,
        }, 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'runtime': undefined,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=unknown-role] must not throw');
      assert.strictEqual(output!.isSameRef, true, '[cell=1, scenario=unknown-role] defaults applied → identity');
    },
  },
];

new ScenarioRunner<Cell1Input, Cell1Output>(
  'ClampOklch :: cell-1 :: range-select',
  async (input) => {
    const engine = makeEngine(input.seed);
    const state  = await engine.run(input.input);
    const color  = state.colors[0]!;
    return { color, isSameRef: color === input.seed, seed: input.seed };
  },
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — clamp rebuild
//
// When a channel falls outside its applicable range clamp:oklch MUST:
//   - allocate a new record (different object reference from the input seed)
//   - clamp L to [lMin, lMax] and C to [cMin, cMax]
//   - preserve hue exactly
//   - preserve sourceFormat and hints through the rebuild
// ---------------------------------------------------------------------------

interface Cell2Input {
  readonly seed:  ColorRecordInterfaceType;
  readonly input: InputInterface;
  readonly lMax:  number;
  readonly cMax:  number;
  readonly lMin:  number;
  readonly cMin:  number;
}
interface Cell2Output {
  readonly color:      ColorRecordInterfaceType;
  readonly isSameRef:  boolean;
  readonly seed:       ColorRecordInterfaceType;
  readonly lMin:       number;
  readonly lMax:       number;
  readonly cMin:       number;
  readonly cMax:       number;
}

const cell2Scenarios: readonly ScenarioInterface<Cell2Input, Cell2Output>[] = [
  {
    name: 'L above default upper bound is clamped to 0.95',
    kind: 'happy',
    input: {
      seed:  colorRecordFactory.fromOklch(0.999, 0.1, 200),
      input: { 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      lMin: 0.05, lMax: 0.95, cMin: 0.0, cMax: 0.40,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=L-above-default] must not throw');
      assert.notStrictEqual(output!.isSameRef, true, '[cell=2, scenario=L-above-default] new record allocated');
      assert.ok(output!.color.oklch.l <= output!.lMax + 1e-9,
        `[cell=2, scenario=L-above-default] L clamped ≤ ${output!.lMax}`);
      assert.ok(output!.color.oklch.l >= output!.lMin - 1e-9,
        `[cell=2, scenario=L-above-default] L ≥ ${output!.lMin}`);
      assert.ok(Math.abs(output!.color.oklch.h - 200) < 1e-6,
        `[cell=2, scenario=L-above-default] hue preserved, got ${output!.color.oklch.h}`);
    },
  },
  {
    name: 'L below default lower bound is clamped to 0.05',
    kind: 'happy',
    input: {
      seed:  colorRecordFactory.fromOklch(0.001, 0.1, 200),
      input: { 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      lMin: 0.05, lMax: 0.95, cMin: 0.0, cMax: 0.40,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=L-below-default] must not throw');
      assert.notStrictEqual(output!.isSameRef, true, '[cell=2, scenario=L-below-default] new record allocated');
      assert.ok(output!.color.oklch.l >= output!.lMin - 1e-9,
        `[cell=2, scenario=L-below-default] L lifted to minimum`);
    },
  },
  {
    name: 'role-defined chromaRange: C exceeding role ceiling is clamped',
    kind: 'happy',
    input: {
      seed: colorRecordFactory.fromOklch(0.5, 0.30, 200, { 'hints': { 'role': 'accent', 'intent': undefined, 'weight': undefined } }),
      input: {
        'colors': [],
        'roles': {
          'name':  'tight-accent',
          'roles': [{ 'name': 'accent', 'chromaRange': [0.00, 0.10], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'required': undefined }], 'contrastPairs': undefined, 'description': undefined,
        }, 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'runtime': undefined,
      },
      lMin: 0.05, lMax: 0.95, cMin: 0.00, cMax: 0.10,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=C-role-clamp] must not throw');
      assert.notStrictEqual(output!.isSameRef, true, '[cell=2, scenario=C-role-clamp] new record allocated');
      assert.ok(output!.color.oklch.c <= 0.10 + 1e-9,
        `[cell=2, scenario=C-role-clamp] C clamped to role ceiling, got ${output!.color.oklch.c}`);
      assert.strictEqual(output!.color.hints?.role, 'accent', '[cell=2, scenario=C-role-clamp] hint preserved through rebuild');
      assert.strictEqual(output!.color.oklch.l, 0.5, '[cell=2, scenario=C-role-clamp] in-range L unchanged');
    },
  },
  {
    name: 'sourceFormat preserved through rebuild',
    kind: 'happy',
    input: {
      seed: colorRecordFactory.fromOklch(0.999, 0.1, 200, { 'sourceFormat': 'hex' }),
      input: { 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      lMin: 0.05, lMax: 0.95, cMin: 0.0, cMax: 0.40,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=sourceFormat-preserved] must not throw');
      assert.strictEqual(output!.color.sourceFormat, 'hex', '[cell=2, scenario=sourceFormat-preserved] sourceFormat preserved');
    },
  },
  {
    name: 'hints preserved through rebuild (role + other keys)',
    kind: 'happy',
    input: {
      seed: colorRecordFactory.fromOklch(0.999, 0.1, 200, { 'hints': { 'role': 'bg', 'weight': 5, 'intent': undefined } }),
      input: { 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      lMin: 0.05, lMax: 0.95, cMin: 0.0, cMax: 0.40,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=hints-preserved] must not throw');
      assert.strictEqual(output!.color.hints?.role, 'bg', '[cell=2, scenario=hints-preserved] role hint preserved');
      assert.strictEqual(output!.color.hints?.weight, 5, '[cell=2, scenario=hints-preserved] weight hint preserved');
    },
  },
  {
    name: 'C above default max clamped to 0.40',
    kind: 'edge',
    input: {
      seed:  colorRecordFactory.fromOklch(0.5, 0.50, 200),
      input: { 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      lMin: 0.05, lMax: 0.95, cMin: 0.0, cMax: 0.40,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=C-above-default] must not throw');
      assert.notStrictEqual(output!.isSameRef, true, '[cell=2, scenario=C-above-default] new record allocated');
      assert.ok(output!.color.oklch.c <= 0.40 + 1e-9,
        `[cell=2, scenario=C-above-default] C clamped to default ceiling`);
    },
  },
];

new ScenarioRunner<Cell2Input, Cell2Output>(
  'ClampOklch :: cell-2 :: clamp-rebuild',
  async (input) => {
    const engine = makeEngine(input.seed);
    const state  = await engine.run(input.input);
    const color  = state.colors[0]!;
    return {
      color,
      isSameRef: color === input.seed,
      seed: input.seed,
      lMin: input.lMin,
      lMax: input.lMax,
      cMin: input.cMin,
      cMax: input.cMax,
    };
  },
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — identity early-return (no allocation)
//
// When a color is already inside its applicable range the task MUST return
// the exact same record reference (no factory call, no object allocation).
// This is the performance contract: O(N) pointer comparisons, not N
// hidden-class allocations.
//
// Covers:
//   - L at exact lower bound (boundary inclusive)
//   - L at exact upper bound (boundary inclusive)
//   - C at exact 0 (achromatic, always in default range)
//   - C at exact default upper bound 0.40
// ---------------------------------------------------------------------------

interface Cell3Input {
  readonly seed:  ColorRecordInterfaceType;
  readonly input: InputInterface;
}
interface Cell3Output {
  readonly isSameRef: boolean;
}

const cell3Scenarios: readonly ScenarioInterface<Cell3Input, Cell3Output>[] = [
  {
    name: 'L = 0.05 (exact lower boundary) → identity',
    kind: 'edge',
    input: {
      seed:  colorRecordFactory.fromOklch(0.05, 0.1, 200),
      input: { 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=L-at-lower] must not throw');
      assert.strictEqual(output!.isSameRef, true, '[cell=3, scenario=L-at-lower] L=0.05 boundary → identity');
    },
  },
  {
    name: 'L = 0.95 (exact upper boundary) → identity',
    kind: 'edge',
    input: {
      seed:  colorRecordFactory.fromOklch(0.95, 0.1, 200),
      input: { 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=L-at-upper] must not throw');
      assert.strictEqual(output!.isSameRef, true, '[cell=3, scenario=L-at-upper] L=0.95 boundary → identity');
    },
  },
  {
    name: 'C = 0.0 (achromatic, always in default range) → identity',
    kind: 'edge',
    input: {
      seed:  colorRecordFactory.fromOklch(0.5, 0.0, 200),
      input: { 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=C-zero] must not throw');
      assert.strictEqual(output!.isSameRef, true, '[cell=3, scenario=C-zero] C=0 → identity');
    },
  },
  {
    name: 'C = 0.40 (exact default C upper bound) → identity',
    kind: 'edge',
    input: {
      seed:  colorRecordFactory.fromOklch(0.5, 0.40, 200),
      input: { 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=C-at-upper] must not throw');
      assert.strictEqual(output!.isSameRef, true, '[cell=3, scenario=C-at-upper] C=0.40 boundary → identity');
    },
  },
];

new ScenarioRunner<Cell3Input, Cell3Output>(
  'ClampOklch :: cell-3 :: identity',
  async (input) => {
    const engine = makeEngine(input.seed);
    const state  = await engine.run(input.input);
    return { isSameRef: state.colors[0] === input.seed };
  },
).run(cell3Scenarios);
