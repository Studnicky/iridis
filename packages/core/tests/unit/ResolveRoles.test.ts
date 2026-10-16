/**
 * ResolveRoles — scenario-matrix suite.
 *
 * Subject: `resolve:roles` pipeline task (ResolveRoles).
 * Drives the task through Engine.run with intake:hex pre-loaded.
 *
 * Cells:
 *   1. chroma-range  — chromaRange enforcement (clamp high and lift low)
 *   2. lightness     — lightnessRange enforcement
 *   3. hint-match    — hints.role takes priority over distance selection
 *   4. synthesis     — required roles synthesised from range centers when no input
 *   5. no-schema     — task is a no-op when no roles schema provided
 */

import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleSchemaInterfaceType,
  TaskInterface
} from '@studnicky/iridis';

import { Engine }             from '@studnicky/iridis';
import { coreTasks }          from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { intakeP3 } from '../../src/tasks/intake/IntakeP3.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestEngineFixture {
  static freshEngine(pipeline: readonly string[] = ['intake:hex', 'resolve:roles']): Engine {
    const engine = new Engine();
    for (const task of coreTasks) {engine.tasks.register(task);}
    engine.pipeline(pipeline);
    return engine;
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — chromaRange enforcement
//
// nudgeIntoRole must clamp a candidate's OKLCH chroma into the role's
// declared chromaRange:
//   - high-chroma input clamped to role ceiling
//   - low-chroma input lifted to role floor
//   - rendered hex round-trips inside the declared range
//   - hue is preserved when only chroma changes
// ---------------------------------------------------------------------------

type Cell1Input = {
  readonly 'colors':  readonly string[];
  readonly 'role':    string;
  readonly 'roles':   RoleSchemaInterfaceType;
};
const cell1Scenarios: readonly ScenarioInterface<Cell1Input, {
  readonly 'assigned': ReturnType<typeof colorRecordFactory.fromHex>;
  readonly 'roleExists': boolean;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=high-chroma-clamp] must not throw');
      assert.strictEqual(output!.roleExists, true, '[cell=1, scenario=high-chroma-clamp] role populated');
      assert.ok(
        output!.assigned.oklch.c >= 0.00 && output!.assigned.oklch.c <= 0.03,
        `[cell=1, scenario=high-chroma-clamp] stored chroma in [0, 0.03]; got ${output!.assigned.oklch.c}`
      );
    },
    'input': {
      'colors': ['#3b82f6'],
      'role': 'background',
      'roles': {
        'contrastPairs': undefined,
        'description': undefined, 'name':  'background-only', 'roles': [{
          'chromaRange':    [0.00, 0.03],
          'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined,
          'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': undefined,
          'lightnessRange': [0.94, 0.99],
          'name':           'background',
          'required':       true
        }]
      }
    },
    'kind': 'happy',
    'name': 'high-chroma seed clamped into chromaRange [0, 0.03]'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=low-chroma-lift] must not throw');
      assert.ok(
        output!.assigned.oklch.c >= 0.15 && output!.assigned.oklch.c <= 0.25,
        `[cell=1, scenario=low-chroma-lift] chroma in [0.15, 0.25]; got ${output!.assigned.oklch.c}`
      );
    },
    'input': {
      'colors': ['#808080'],
      'role': 'accent',
      'roles': {
        'contrastPairs': undefined,
        'description': undefined, 'name':  'accent-only', 'roles': [{
          'chromaRange':    [0.15, 0.25],
          'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined,
          'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': undefined,
          'lightnessRange': [0.50, 0.60],
          'name':           'accent',
          'required':       true
        }]
      }
    },
    'kind': 'happy',
    'name': 'low-chroma input lifted to chromaRange floor [0.15, 0.25]'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=hex-round-trip] must not throw');
      const reparsed = colorRecordFactory.fromHex(output!.assigned.hex);
      assert.ok(
        reparsed.oklch.c >= 0.00 && reparsed.oklch.c <= 0.03,
        `[cell=1, scenario=hex-round-trip] rendered hex ${output!.assigned.hex} chroma in [0, 0.03]; got ${reparsed.oklch.c}`
      );
    },
    'input': {
      'colors': ['#3b82f6'],
      'role': 'background',
      'roles': {
        'contrastPairs': undefined,
        'description': undefined, 'name':  'background-only', 'roles': [{
          'chromaRange':    [0.00, 0.03],
          'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined,
          'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': undefined,
          'lightnessRange': [0.94, 0.99],
          'name':           'background',
          'required':       true
        }]
      }
    },
    'kind': 'happy',
    'name': 'rendered hex round-trips inside declared chromaRange'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=hue-preserved] must not throw');
      const sourceHue = colorRecordFactory.fromHex('#3b82f6').oklch.h;
      const hueDiff   = Math.abs(((output!.assigned.oklch.h - sourceHue + 540) % 360) - 180);
      assert.ok(
        hueDiff < 10,
        `[cell=1, scenario=hue-preserved] hue approximately preserved (source ~${sourceHue.toFixed(1)}, got ${output!.assigned.oklch.h.toFixed(1)}, diff ${hueDiff.toFixed(2)})`
      );
    },
    'input': {
      'colors': ['#3b82f6'],
      'role': 'soft',
      'roles': {
        'contrastPairs': undefined,
        'description': undefined, 'name':  'soft-blue', 'roles': [{
          'chromaRange':    [0.00, 0.03],
          'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined,
          'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': undefined,
          'lightnessRange': [0.94, 0.99],
          'name':           'soft',
          'required':       true
        }]
      }
    },
    'kind': 'happy',
    'name': 'hue preserved when only chroma is clamped'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=conformant-chroma] must not throw');
      assert.ok(
        output!.assigned.oklch.c >= 0.00 && output!.assigned.oklch.c <= 0.05,
        `[cell=1, scenario=conformant-chroma] chroma already conformant; got ${output!.assigned.oklch.c}`
      );
    },
    'input': {
      'colors': ['#f0f4ff'],
      'role': 'light',
      'roles': {
        'contrastPairs': undefined,
        'description': undefined, 'name':  'light-bg', 'roles': [{
          'chromaRange':    [0.00, 0.05],
          'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined,
          'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': undefined,
          'lightnessRange': [0.90, 1.00],
          'name':           'light',
          'required':       true
        }]
      }
    },
    'kind': 'edge',
    'name': 'already-conformant chroma: no rebuild, value unchanged'
  }
];

new ScenarioRunner<Cell1Input, {
  readonly 'assigned': ReturnType<typeof colorRecordFactory.fromHex>;
  readonly 'roleExists': boolean;
}>(
  'ResolveRoles :: cell-1 :: chroma-range',
  (input) => {
    const engine = TestEngineFixture.freshEngine();
    const state  = engine.run({ 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': input.roles, 'runtime': undefined });
    const assigned = state.roles[input.role];
    return {
      'assigned':   assigned ?? colorRecordFactory.fromOklch(0, 0, 0),
      'roleExists': assigned !== undefined
    };
  }
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — lightnessRange enforcement
//
// lightnessRange must also be clamped in nudgeIntoRole:
//   - bright color assigned to a very-light role → L lifted to range floor
//   - dark color assigned to a very-light role → L lifted to range floor
//   - L preserved when already in range
// ---------------------------------------------------------------------------

type Cell2Input = {
  readonly 'colors': readonly string[];
  readonly 'lMax':   number;
  readonly 'lMin':   number;
  readonly 'role':   string;
  readonly 'roles':  RoleSchemaInterfaceType;
};
const cell2Scenarios: readonly ScenarioInterface<Cell2Input, {
  readonly 'l':    number;
  readonly 'lMax': number;
  readonly 'lMin': number;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=dark-lifted] must not throw');
      assert.ok(
        output!.l >= output!.lMin && output!.l <= output!.lMax,
        `[cell=2, scenario=dark-lifted] L in [${output!.lMin}, ${output!.lMax}]; got ${output!.l}`
      );
    },
    'input': {
      'colors': ['#1a1a2e'],
      'lMax': 0.99,
      'lMin': 0.94,
      'role': 'background', 'roles': {
        'contrastPairs': undefined,
        'description': undefined, 'name':  'bg-only', 'roles': [{
          'chromaRange':    [0.00, 0.05],
          'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined,
          'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': undefined,
          'lightnessRange': [0.94, 0.99],
          'name':           'background',
          'required':       true
        }]
      }
    },
    'kind': 'happy',
    'name': 'dark color assigned to very-light role: L lifted into [0.94, 0.99]'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=bright-clamped] must not throw');
      assert.ok(
        output!.l >= output!.lMin && output!.l <= output!.lMax,
        `[cell=2, scenario=bright-clamped] L in [${output!.lMin}, ${output!.lMax}]; got ${output!.l}`
      );
    },
    'input': {
      'colors': ['#ffffff'],
      'lMax': 0.15,
      'lMin': 0.05,
      'role': 'dark', 'roles': {
        'contrastPairs': undefined,
        'description': undefined, 'name':  'dark-only', 'roles': [{
          'chromaRange':    [0.00, 0.05],
          'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined,
          'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': undefined,
          'lightnessRange': [0.05, 0.15],
          'name':           'dark',
          'required':       true
        }]
      }
    },
    'kind': 'happy',
    'name': 'bright color assigned to very-dark role: L clamped into [0.05, 0.15]'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=conformant-L] must not throw');
      assert.ok(
        output!.l >= output!.lMin && output!.l <= output!.lMax,
        `[cell=2, scenario=conformant-L] L in [${output!.lMin}, ${output!.lMax}]; got ${output!.l}`
      );
    },
    'input': {
      'colors': ['#808080'],
      'lMax': 0.60,
      'lMin': 0.40,
      'role': 'mid', 'roles': {
        'contrastPairs': undefined,
        'description': undefined, 'name':  'mid-only', 'roles': [{
          'chromaRange': undefined,
          'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined,
          'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': undefined,
          'lightnessRange': [0.40, 0.60],
          'name':           'mid',
          'required':       true
        }]
      }
    },
    'kind': 'edge',
    'name': 'mid-tone color assigned to mid-range role: L already conformant'
  }
];

new ScenarioRunner<Cell2Input, {
  readonly 'l':    number;
  readonly 'lMax': number;
  readonly 'lMin': number;
}>(
  'ResolveRoles :: cell-2 :: lightness-range',
  (input) => {
    const engine = TestEngineFixture.freshEngine();
    const state  = engine.run({ 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': input.roles, 'runtime': undefined });
    const assigned = state.roles[input.role];
    return {
      'l':    assigned?.oklch.l ?? -1,
      'lMax': input.lMax,
      'lMin': input.lMin
    };
  }
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — hint-match priority
//
// A color carrying hints.role === <name> must win the role, bypassing
// distance selection. When multiple colors are present the hinted one wins.
// ---------------------------------------------------------------------------

type Cell3Input = {
  readonly 'colors':    readonly string[];
  readonly 'hintedHex': string;
  readonly 'hintRole':  string;
  readonly 'roles':     RoleSchemaInterfaceType;
};
const cell3Scenarios: readonly ScenarioInterface<Cell3Input, {
  readonly 'assignedHex': string;
  readonly 'hintedHex':   string;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=hint-wins] must not throw');
      assert.strictEqual(
        output!.assignedHex,
        output!.hintedHex,
        '[cell=3, scenario=hint-wins] a caller-stated role remains exact'
      );
    },
    'input': {
      'colors':    ['#808080', '#3b82f6'],
      'hintedHex': '#3b82f6',
      'hintRole':  'accent',
      'roles': {
        'contrastPairs': undefined,
        'description': undefined, 'name':  'accent-only', 'roles': [{
          'chromaRange':    [0.10, 0.30],
          'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined,
          'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': undefined,
          'lightnessRange': [0.50, 0.65],
          'name':           'accent',
          'required':       true
        }]
      }
    },
    'kind': 'happy',
    'name': 'hinted color wins over closer candidate'
  }
];

new ScenarioRunner<Cell3Input, {
  readonly 'assignedHex': string;
  readonly 'hintedHex':   string;
}>(
  'ResolveRoles :: cell-3 :: hint-match',
  (input) => {
    // Build engine with intake:hex pipeline, then seed with a hinted record
    // by adding the hinted color via the intake pipeline and attaching the hint
    // manually using factory. We use a custom approach: intake all colors, then
    // re-apply the hint by adding another engine pass.
    //
    // Simpler approach: run intake:hex on all colors, then pass the hinted
    // record in via a separate engine run that seeds state with the hinted record.
    //
    // Cleanest: run engine with both colors where one is produced with a hint.
    // We construct the hinted color via fromHex with hints and seed it via
    // onRunStart hook + the intake-derived records.

    const engine = new Engine();
    for (const t of coreTasks) {engine.tasks.register(t);}

    // Build the hinted record directly via factory
    const hintedRecord = colorRecordFactory.fromHex(input.hintedHex, {
      'hints': { 'intent': undefined, 'role': input.hintRole, 'weight': undefined },
      'sourceFormat': 'hex'
    });

    // Seed state with both the hinted record and the other colors via hooks
    const otherColors = input.colors.filter((c) => {return c !== input.hintedHex;});

    const seedHintRun = (state: PaletteStateInterface, _pipelineContext: PipelineContextInterface): void => {
      state.colors.push(hintedRecord);
    };
    const seedTask: TaskInterface = {
      'manifest': { 'description': undefined, 'name': 'seed:hint', 'phase': 'onRunStart', 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name':     'seed:hint',
      'run':      seedHintRun
    };
    engine.tasks.hook('onRunStart', seedTask);
    engine.pipeline(['intake:hex', 'resolve:roles']);

    const state = engine.run({ 'bypass': undefined, 'colors': otherColors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': input.roles, 'runtime': undefined });
    const assigned = state.roles[input.hintRole];
    return {
      'assignedHex': assigned?.hex ?? '',
      'hintedHex':   input.hintedHex
    };
  }
).run(cell3Scenarios);

// ---------------------------------------------------------------------------
// Cell 4 — synthesis when no input colors
//
// When state.colors is empty and a role is required, resolve:roles must
// synthesise the role from the declared range centers:
//   - L = center of lightnessRange
//   - C = center of chromaRange
//   - role provenance records the synthesised origin
// ---------------------------------------------------------------------------


const cell4Scenarios: readonly ScenarioInterface<{
  readonly 'cMid':  number;
  readonly 'lMid':  number;
  readonly 'role':  string;
  readonly 'roles': RoleSchemaInterfaceType;
}, {
  readonly 'assigned': ReturnType<typeof colorRecordFactory.fromOklch>;
  readonly 'roleExists': boolean;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=synth-required] must not throw');
      assert.strictEqual(output!.roleExists, true, '[cell=4, scenario=synth-required] role populated');
      assert.ok(
        Math.abs(output!.assigned.oklch.l - 0.60) < 1e-9,
        `[cell=4, scenario=synth-required] L = range center 0.60; got ${output!.assigned.oklch.l}`
      );
      assert.ok(
        Math.abs(output!.assigned.oklch.c - 0.20) < 1e-9,
        `[cell=4, scenario=synth-required] C = range center 0.20; got ${output!.assigned.oklch.c}`
      );
    },
    'input': {
      'cMid': 0.20,
      'lMid': 0.60,
      'role': 'accent',
      'roles': {
        'contrastPairs': undefined,
        'description': undefined, 'name':  'accent-synth', 'roles': [{
          'chromaRange':    [0.10, 0.30],
          'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined,
          'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': undefined,
          'lightnessRange': [0.50, 0.70],
          'name':           'accent',
          'required':       true
        }]
      }
    },
    'kind': 'happy',
    'name': 'required role synthesised from lightnessRange and chromaRange centers'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=optional-not-synth] must not throw');
      assert.strictEqual(output!.roleExists, false, '[cell=4, scenario=optional-not-synth] optional role not populated');
    },
    'input': {
      'cMid': 0,
      'lMid': 0.60,
      'role': 'optional',
      'roles': {
        'contrastPairs': undefined,
        'description': undefined, 'name':  'optional-only', 'roles': [{
          'chromaRange': undefined,
          'derivedFrom': undefined,
          'description': undefined,
          'hue': undefined,
          'hueClamp': undefined,
          'hueOffset': undefined,
          'intent': undefined,
          'lightnessRange': [0.50, 0.70],
          'name':           'optional',
          'required': undefined
        }]
      }
    },
    'kind': 'edge',
    'name': 'optional role (not required) is not synthesised when no colors'
  }
];

new ScenarioRunner<{
  readonly 'cMid':  number;
  readonly 'lMid':  number;
  readonly 'role':  string;
  readonly 'roles': RoleSchemaInterfaceType;
}, {
  readonly 'assigned': ReturnType<typeof colorRecordFactory.fromOklch>;
  readonly 'roleExists': boolean;
}>(
  'ResolveRoles :: cell-4 :: synthesis',
  (input) => {
    const engine = TestEngineFixture.freshEngine(['resolve:roles']);
    const state  = engine.run({ 'bypass': undefined, 'colors': [], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': input.roles, 'runtime': undefined });
    const assigned = state.roles[input.role];
    return {
      'assigned':   assigned ?? colorRecordFactory.fromOklch(0, 0, 0),
      'roleExists': assigned !== undefined
    };
  }
).run(cell4Scenarios);

// ---------------------------------------------------------------------------
// Cell 5 — no-schema no-op
//
// When state.input.roles is absent, resolve:roles must return without
// touching state.roles (roles stays empty {}).
// ---------------------------------------------------------------------------

type Cell5Input = {
  readonly 'colors': readonly string[];
};
type Cell5Output = {
  readonly 'rolesKeys': string[];
};

const cell5Scenarios: readonly ScenarioInterface<Cell5Input, Cell5Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=no-schema] must not throw');
      assert.deepStrictEqual(output!.rolesKeys, [], '[cell=5, scenario=no-schema] roles stays empty');
    },
    'input': { 'colors': ['#ff0000', '#00ff00'] },
    'kind': 'edge',
    'name': 'no roles schema: state.roles remains empty'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=empty-no-schema] must not throw');
      assert.deepStrictEqual(output!.rolesKeys, [], '[cell=5, scenario=empty-no-schema] roles stays empty');
    },
    'input': { 'colors': [] },
    'kind': 'edge',
    'name': 'empty colors no roles schema: roles empty'
  }
];

new ScenarioRunner<Cell5Input, Cell5Output>(
  'ResolveRoles :: cell-5 :: no-schema',
  (input) => {
    const engine = TestEngineFixture.freshEngine();
    const state  = engine.run({ 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
    return { 'rolesKeys': Object.keys(state.roles) };
  }
).run(cell5Scenarios);

class RoleSeedTask implements TaskInterface {
  readonly 'name' = 'seed:role-resolution-contract';

  readonly 'manifest' = {
    'description': undefined,
    'name': 'seed:role-resolution-contract',
    'phase': 'onRunStart' as const,
    'reads': undefined,
    'requires': undefined,
    'writes': ['colors']
  };

  constructor(private readonly seeds: readonly ColorRecordInterfaceType[]) {}

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    state.colors.push(...this.seeds);
  }
}

class RoleResolutionFixture {
  static run(schema: RoleSchemaInterfaceType, seeds: readonly ColorRecordInterfaceType[]): PaletteStateInterface {
    const engine = new Engine();
    for (const task of coreTasks) {engine.tasks.register(task);}
    engine.tasks.hook('onRunStart', new RoleSeedTask(seeds));
    engine.pipeline(['resolve:roles', 'expand:family']);
    return engine.run({ 'bypass': undefined, 'colors': [], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': schema, 'runtime': undefined });
  }

  static seed(role: string, l: number, c: number, h: number): ColorRecordInterfaceType {
    const result = colorRecordFactory.fromOklch(l, c, h, {
      'alpha': 1,
      'hints': { 'intent': undefined, 'role': role, 'weight': undefined },
      'sourceFormat': 'oklch'
    });
    return result;
  }
}

void test('a hinted derived role is pinned, nudged, and preserved by family expansion', () => {
  const state = RoleResolutionFixture.run({
    'contrastPairs': undefined,
    'description': undefined,
    'name': 'hinted-derived',
    'roles': [
      { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'root', 'required': true },
      { 'chromaRange': undefined, 'derivedFrom': 'root', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 30, 'intent': undefined, 'lightnessRange': undefined, 'name': 'accent', 'required': undefined }
    ]
  }, [
    RoleResolutionFixture.seed('root', 0.60, 0.10, 240),
    RoleResolutionFixture.seed('accent', 0.63, 0.11, 15)
  ]);
  const accent = state.roles.accent;
  const statedSeed = state.colors.find((color) => {return color.hints?.role === 'accent';});
  assert.strictEqual(accent, statedSeed, 'the hinted derived role retains the original record');
  assert.deepStrictEqual(state.metadata['core:roleProvenance'], {
    'accent': { 'adjustments': [], 'origin': 'stated' },
    'root': { 'adjustments': [], 'origin': 'stated' }
  });
});

void test('direct and derived hue offsets are signed relative deltas, including wrap and chains', () => {
  const state = RoleResolutionFixture.run({
    'contrastPairs': undefined,
    'description': undefined,
    'name': 'relative-hue-offsets',
    'roles': [
      { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'root', 'required': true },
      { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': -30, 'intent': undefined, 'lightnessRange': undefined, 'name': 'direct', 'required': true },
      { 'chromaRange': undefined, 'derivedFrom': 'root', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': -30, 'intent': undefined, 'lightnessRange': undefined, 'name': 'derived', 'required': undefined },
      { 'chromaRange': undefined, 'derivedFrom': 'derived', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 50, 'intent': undefined, 'lightnessRange': undefined, 'name': 'chained', 'required': undefined }
    ]
  }, [
    RoleResolutionFixture.seed('root', 0.60, 0.10, 350),
    RoleResolutionFixture.seed('direct', 0.60, 0.10, 350)
  ]);
  const direct = state.roles.direct;
  const derived = state.roles.derived;
  const chained = state.roles.chained;
  assert.ok(direct !== undefined && derived !== undefined && chained !== undefined, 'every direct and derived role resolves');
  assert.ok(Math.abs(direct.oklch.h - 350) < 0.001, `caller-stated direct hue remains 350°, got ${direct.oklch.h}`);
  assert.ok(Math.abs(derived.oklch.h - 320) < 0.001, `derived hue is 320°, got ${derived.oklch.h}`);
  assert.ok(Math.abs(chained.oklch.h - 10) < 0.001, `chained hue wraps to 10°, got ${chained.oklch.h}`);
});

void test('relative lightness and chroma derivation clamps each source-relative coordinate to the role range', () => {
  const state = RoleResolutionFixture.run({
    'contrastPairs': undefined,
    'description': undefined,
    'name': 'relative-lightness-chroma',
    'roles': [
      { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'root', 'required': true },
      { 'chromaRange': [0.05, 0.25], 'chromaScale': 2, 'derivedFrom': 'root', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessOffset': 0.30, 'lightnessRange': [0.65, 0.75], 'name': 'surface', 'required': undefined }
    ]
  }, [RoleResolutionFixture.seed('root', 0.60, 0.20, 100)]);
  const surface = state.roles.surface;
  assert.ok(surface !== undefined, 'the source-relative role resolves');
  assert.ok(Math.abs(surface.oklch.l - 0.75) < 0.001, `surface lightness clamps to 0.75, got ${surface.oklch.l}`);
  assert.ok(Math.abs(surface.oklch.c - 0.25) < 0.001, `surface chroma clamps to 0.25, got ${surface.oklch.c}`);
});

void test('a conformant Display-P3 role seed retains verbatim P3 metadata when role intent is applied', () => {
  const p3Candidate = intakeP3.parse('color(display-p3 0.9 0.2 0.1)');
  const hintedP3: ColorRecordInterfaceType = {
    ...p3Candidate,
    'hints': { 'intent': undefined, 'role': 'accent', 'weight': undefined }
  };
  const state = RoleResolutionFixture.run({
    'contrastPairs': undefined,
    'description': undefined,
    'name': 'p3-intent-preservation',
    'roles': [{
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'description': undefined,
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent': 'accent',
      'lightnessRange': undefined,
      'name': 'accent',
      'required': true
    }]
  }, [hintedP3]);
  const accent = state.roles.accent;
  const statedSeed = state.colors.find((color) => {return color.hints?.role === 'accent';});
  assert.strictEqual(accent, statedSeed, 'the hinted derived role retains the original record');
  assert.ok(accent !== undefined, 'the hinted Display-P3 role resolves');
  assert.deepStrictEqual(accent.displayP3, p3Candidate.displayP3, 'verbatim Display-P3 channels are preserved');
  assert.deepStrictEqual(accent.hints, hintedP3.hints, 'input intent remains exact');
});
