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

import type { JSONSchema7Type } from 'json-schema';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';
import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../src/interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../src/interfaces/TaskInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { Engine } from '../../src/engine/Engine.ts';
import { ColorHintsEntity } from '../../src/entities/ColorHintsEntity.ts';
import { ColorRecordEntity } from '../../src/entities/ColorRecordEntity.ts';
import { ContrastPairEntity } from '../../src/entities/ContrastPairEntity.ts';
import { InputEntity } from '../../src/entities/InputEntity.ts';
import { RoleDefinitionEntity } from '../../src/entities/RoleDefinitionEntity.ts';
import { RoleSchemaEntity } from '../../src/entities/RoleSchemaEntity.ts';
import { TaskManifestEntity } from '../../src/entities/TaskManifestEntity.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { coreTasks } from '../../src/tasks/index.ts';
import { intakeP3 } from '../../src/tasks/intake/IntakeP3.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestEngineFixture {
  static freshEngine(pipeline: readonly string[] = ['intake:hex', 'resolve:roles']): Engine {
    const engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {engine.tasks.register(task);}
    }
    engine.pipeline(pipeline);
    return engine;
  }

  static admitRoleSchema(value: JSONSchema7Type): RoleSchemaEntity.Type {
    const schema = RoleSchemaEntity.intake(value);
    const contrastPairs = schema.contrastPairs?.map((pair) => {
      const result = ContrastPairEntity.intake(pair);
      return result;
    });
    const roles = schema.roles.map((role) => {
      const result = RoleDefinitionEntity.intake(role);
      return result;
    });
    const result = RoleSchemaEntity.intake({
      ...(contrastPairs === undefined ? {} : { 'contrastPairs': contrastPairs }),
      ...(schema.description === undefined ? {} : { 'description': schema.description }),
      'name': schema.name,
      ...(schema.relationshipGraph === undefined ? {} : { 'relationshipGraph': schema.relationshipGraph }),
      'roles': roles
    });
    return result;
  }

  static input(colors: readonly string[], roles: RoleSchemaEntity.Type | undefined = undefined): InputEntity.Type {
    const result = InputEntity.create({
      'colors': [...colors],
      ...(roles === undefined ? {} : { 'roles': roles })
    });
    return result;
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

interface Cell1InputInterface {
  readonly 'colors':  readonly string[];
  readonly 'role':    string;
  readonly 'roles':   JSONSchema7Type;
};
class ResolveRolesCell1Scenarios {
  static readonly 'values': readonly ScenarioInterface<Cell1InputInterface, {
    readonly 'assigned': ReturnType<typeof colorRecordFactory.fromHex>;
    readonly 'resolvedHex': string;
  }>[] = [
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=1, scenario=high-chroma-clamp] must not throw');
        assert.notStrictEqual(output!.resolvedHex, '', '[cell=1, scenario=high-chroma-clamp] role populated');
        assert.ok(
          output!.assigned.oklch.c >= 0.00 && output!.assigned.oklch.c <= 0.03,
          `[cell=1, scenario=high-chroma-clamp] stored chroma in [0, 0.03]; got ${output!.assigned.oklch.c}`
        );
      },
      'input': {
        'colors': ['#3b82f6'],
        'role': 'background',
        'roles': {
          'name':  'background-only', 'roles': [{
            'chromaRange':    [0.00, 0.03],
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
          'name':  'accent-only', 'roles': [{
            'chromaRange':    [0.15, 0.25],
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
          'name':  'background-only', 'roles': [{
            'chromaRange':    [0.00, 0.03],
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
          'name':  'soft-blue', 'roles': [{
            'chromaRange':    [0.00, 0.03],
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
          'name':  'light-bg', 'roles': [{
            'chromaRange':    [0.00, 0.05],
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
}

new ScenarioRunner<Cell1InputInterface, {
  readonly 'assigned': ReturnType<typeof colorRecordFactory.fromHex>;
  readonly 'resolvedHex': string;
}>(
  'ResolveRoles :: cell-1 :: chroma-range',
  (input) => {
    const engine = TestEngineFixture.freshEngine();
    const state  = engine.run(TestEngineFixture.input(input.colors, TestEngineFixture.admitRoleSchema(input.roles)));
    const assigned = state.roles[input.role];
    return {
      'assigned':   assigned ?? colorRecordFactory.fromOklch(0, 0, 0),
      'resolvedHex': assigned?.hex ?? ''
    };
  }
).run(ResolveRolesCell1Scenarios.values);

// ---------------------------------------------------------------------------
// Cell 2 — lightnessRange enforcement
//
// lightnessRange must also be clamped in nudgeIntoRole:
//   - bright color assigned to a very-light role → L lifted to range floor
//   - dark color assigned to a very-light role → L lifted to range floor
//   - L preserved when already in range
// ---------------------------------------------------------------------------

interface Cell2InputInterface {
  readonly 'colors': readonly string[];
  readonly 'lightnessMaximum':   number;
  readonly 'lightnessMinimum':   number;
  readonly 'role':   string;
  readonly 'roles':  JSONSchema7Type;
};
class ResolveRolesCell2Scenarios {
  static readonly 'values': readonly ScenarioInterface<Cell2InputInterface, {
    readonly 'l':    number;
    readonly 'lightnessMaximum': number;
    readonly 'lightnessMinimum': number;
  }>[] = [
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=2, scenario=dark-lifted] must not throw');
        assert.ok(
          output!.l >= output!.lightnessMinimum && output!.l <= output!.lightnessMaximum,
          `[cell=2, scenario=dark-lifted] L in [${output!.lightnessMinimum}, ${output!.lightnessMaximum}]; got ${output!.l}`
        );
      },
      'input': {
        'colors': ['#1a1a2e'],
        'lightnessMaximum': 0.99,
        'lightnessMinimum': 0.94,
        'role': 'background', 'roles': {
          'name':  'bg-only', 'roles': [{
            'chromaRange':    [0.00, 0.05],
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
          output!.l >= output!.lightnessMinimum && output!.l <= output!.lightnessMaximum,
          `[cell=2, scenario=bright-clamped] L in [${output!.lightnessMinimum}, ${output!.lightnessMaximum}]; got ${output!.l}`
        );
      },
      'input': {
        'colors': ['#ffffff'],
        'lightnessMaximum': 0.15,
        'lightnessMinimum': 0.05,
        'role': 'dark', 'roles': {
          'name':  'dark-only', 'roles': [{
            'chromaRange':    [0.00, 0.05],
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
          output!.l >= output!.lightnessMinimum && output!.l <= output!.lightnessMaximum,
          `[cell=2, scenario=conformant-L] L in [${output!.lightnessMinimum}, ${output!.lightnessMaximum}]; got ${output!.l}`
        );
      },
      'input': {
        'colors': ['#808080'],
        'lightnessMaximum': 0.60,
        'lightnessMinimum': 0.40,
        'role': 'mid', 'roles': {
          'name':  'mid-only', 'roles': [{
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
}

new ScenarioRunner<Cell2InputInterface, {
  readonly 'l':    number;
  readonly 'lightnessMaximum': number;
  readonly 'lightnessMinimum': number;
}>(
  'ResolveRoles :: cell-2 :: lightness-range',
  (input) => {
    const engine = TestEngineFixture.freshEngine();
    const state  = engine.run(TestEngineFixture.input(input.colors, TestEngineFixture.admitRoleSchema(input.roles)));
    const assigned = state.roles[input.role];
    return {
      'l':    assigned?.oklch.l ?? -1,
      'lightnessMaximum': input.lightnessMaximum,
      'lightnessMinimum': input.lightnessMinimum
    };
  }
).run(ResolveRolesCell2Scenarios.values);

// ---------------------------------------------------------------------------
// Cell 3 — hint-match priority
//
// A color carrying hints.role === <name> must win the role, bypassing
// distance selection. When multiple colors are present the hinted one wins.
// ---------------------------------------------------------------------------

interface Cell3InputInterface {
  readonly 'colors':    readonly string[];
  readonly 'hintedHex': string;
  readonly 'hintRole':  string;
  readonly 'roles':     JSONSchema7Type;
};
class ResolveRolesCell3Scenarios {
  static readonly 'values': readonly ScenarioInterface<Cell3InputInterface, {
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
          'name':  'accent-only', 'roles': [{
            'chromaRange':    [0.10, 0.30],
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
}

new ScenarioRunner<Cell3InputInterface, {
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
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {engine.tasks.register(task);}
    }

    // Build the hinted record directly via factory
    const hintedRecord = colorRecordFactory.fromHex(input.hintedHex, {
      'hints': ColorHintsEntity.create({ 'role': input.hintRole }),
      'sourceFormat': 'hex'
    });

    // Seed state with both the hinted record and the other colors via hooks
    const otherColors = input.colors.filter((color) => {
      const result = color !== input.hintedHex;
      return result;
    });

    const seedHintRun = (state: PaletteStateInterface, _pipelineContext: PipelineContextInterface): void => {
      state.colors.push(hintedRecord);
    };
    const seedTask: TaskInterface = {
      'manifest': TaskManifestEntity.create({ 'name': 'seed:hint', 'phase': 'onRunStart' }),
      'name':     'seed:hint',
      'run':      seedHintRun
    };
    engine.tasks.hook(seedTask);
    engine.pipeline(['intake:hex', 'resolve:roles']);

    const state = engine.run(TestEngineFixture.input(otherColors, TestEngineFixture.admitRoleSchema(input.roles)));
    const assigned = state.roles[input.hintRole];
    return {
      'assignedHex': assigned?.hex ?? '',
      'hintedHex':   input.hintedHex
    };
  }
).run(ResolveRolesCell3Scenarios.values);

// ---------------------------------------------------------------------------
// Cell 4 — synthesis when no input colors
//
// When state.colors is empty and a role is required, resolve:roles must
// synthesise the role from the declared range centers:
//   - L = center of lightnessRange
//   - C = center of chromaRange
//   - role provenance records the synthesised origin
// ---------------------------------------------------------------------------


class ResolveRolesCell4Scenarios {
  static readonly 'values': readonly ScenarioInterface<{
    readonly 'cMid':  number;
    readonly 'lMid':  number;
    readonly 'role':  string;
    readonly 'roles': JSONSchema7Type;
  }, {
    readonly 'assigned': ReturnType<typeof colorRecordFactory.fromOklch>;
    readonly 'resolvedHex': string;
  }>[] = [
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=4, scenario=synth-required] must not throw');
        assert.notStrictEqual(output!.resolvedHex, '', '[cell=4, scenario=synth-required] role populated');
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
          'name':  'accent-synth', 'roles': [{
            'chromaRange':    [0.10, 0.30],
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
        assert.strictEqual(output!.resolvedHex, '', '[cell=4, scenario=optional-not-synth] optional role not populated');
      },
      'input': {
        'cMid': 0,
        'lMid': 0.60,
        'role': 'optional',
        'roles': {
          'name':  'optional-only', 'roles': [{
            'lightnessRange': [0.50, 0.70],
            'name':           'optional'
          }]
        }
      },
      'kind': 'edge',
      'name': 'optional role (not required) is not synthesised when no colors'
    }
  ];
}

new ScenarioRunner<{
  readonly 'cMid':  number;
  readonly 'lMid':  number;
  readonly 'role':  string;
  readonly 'roles': JSONSchema7Type;
}, {
  readonly 'assigned': ReturnType<typeof colorRecordFactory.fromOklch>;
  readonly 'resolvedHex': string;
}>(
  'ResolveRoles :: cell-4 :: synthesis',
  (input) => {
    const engine = TestEngineFixture.freshEngine(['resolve:roles']);
    const state  = engine.run(TestEngineFixture.input([], TestEngineFixture.admitRoleSchema(input.roles)));
    const assigned = state.roles[input.role];
    return {
      'assigned':   assigned ?? colorRecordFactory.fromOklch(0, 0, 0),
      'resolvedHex': assigned?.hex ?? ''
    };
  }
).run(ResolveRolesCell4Scenarios.values);

// ---------------------------------------------------------------------------
// Cell 5 — no-schema no-op
//
// When state.input.roles is absent, resolve:roles must return without
// touching state.roles (roles stays empty {}).
// ---------------------------------------------------------------------------

interface Cell5InputInterface {
  readonly 'colors': readonly string[];
};
interface Cell5OutputInterface {
  readonly 'roles': PaletteStateInterface['roles'];
};

class ResolveRolesCell5Scenarios {
  static readonly 'values': readonly ScenarioInterface<Cell5InputInterface, Cell5OutputInterface>[] = [
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=5, scenario=no-schema] must not throw');
        assert.deepStrictEqual(Object.keys(output!.roles), [], '[cell=5, scenario=no-schema] roles stays empty');
      },
      'input': { 'colors': ['#ff0000', '#00ff00'] },
      'kind': 'edge',
      'name': 'no roles schema: state.roles remains empty'
    },
    {
      'assert': function(output, error) {
        assert.strictEqual(error, undefined, '[cell=5, scenario=empty-no-schema] must not throw');
        assert.deepStrictEqual(Object.keys(output!.roles), [], '[cell=5, scenario=empty-no-schema] roles stays empty');
      },
      'input': { 'colors': [] },
      'kind': 'edge',
      'name': 'empty colors no roles schema: roles empty'
    }
  ];
}

new ScenarioRunner<Cell5InputInterface, Cell5OutputInterface>(
  'ResolveRoles :: cell-5 :: no-schema',
  (input) => {
    const engine = TestEngineFixture.freshEngine();
    const state  = engine.run(TestEngineFixture.input(input.colors));
    const result = { 'roles': state.roles };
    return result;
  }
).run(ResolveRolesCell5Scenarios.values);

class RoleSeedTask implements TaskInterface {
  readonly 'name' = 'seed:role-resolution-contract';

  readonly 'manifest': TaskInterface['manifest'] = TaskManifestEntity.create({
    'name': 'seed:role-resolution-contract',
    'phase': 'onRunStart',
    'writes': ['colors']
  });

  constructor(private readonly seeds: readonly ColorRecordEntity.Type[]) {}

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    state.colors.push(...this.seeds);
  }
}

class RoleResolutionFixture {
  static run(schema: JSONSchema7Type, seeds: readonly ColorRecordEntity.Type[]): PaletteStateInterface {
    const engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {engine.tasks.register(task);}
    }
    engine.tasks.hook(new RoleSeedTask(seeds));
    engine.pipeline(['resolve:roles', 'derive:roleRelations']);
    const result = engine.run(TestEngineFixture.input([], TestEngineFixture.admitRoleSchema(schema)));
    return result;
  }

  static seed(role: string, l: number, c: number, h: number): ColorRecordEntity.Type {
    const result = colorRecordFactory.fromOklch(l, c, h, {
      'alpha': 1,
      'hints': ColorHintsEntity.create({ 'role': role }),
      'sourceFormat': 'oklch'
    });
    return result;
  }
}

void test('a stated graph target remains exact', () => {
  const state = RoleResolutionFixture.run({
    'name': 'stated-target',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'root',
        'defaultMode': 'default',
        'id': 'family',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'default' }],
        'name': 'Family',
        'relationships': [{ 'id': 'accent', 'operation': 'alias', 'priority': 1, 'relaxability': 'fixed', 'source': 'root', 'target': 'accent' }]
      }]
    },
    'roles': [
      { 'name': 'root', 'required': true },
      { 'name': 'accent' }
    ]
  }, [
    RoleResolutionFixture.seed('root', 0.60, 0.10, 240),
    RoleResolutionFixture.seed('accent', 0.63, 0.11, 15)
  ]);
  const accent = state.roles.accent;
  const statedSeed = state.colors.find((color) => {
    const result = color.hints?.role === 'accent';
    return result;
  });
  assert.strictEqual(accent, statedSeed);
  assert.deepStrictEqual(state.metadata['core:roleProvenance'], {
    'accent': { 'adjustments': [], 'origin': 'stated' },
    'root': { 'adjustments': [], 'origin': 'stated' }
  });
});

void test('graph hue offsets compose across source relationships', () => {
  const state = RoleResolutionFixture.run({
    'name': 'relative-hue-offsets',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'root',
        'defaultMode': 'default',
        'id': 'family',
        'modes': [{ 'hueOffsets': [{ 'degrees': -30, 'variantId': 'near' }], 'id': 'default' }],
        'name': 'Family',
        'relationships': [
          { 'degrees': -30, 'id': 'derived', 'operation': 'hue-offset', 'priority': 1, 'relaxability': 'fixed', 'source': 'root', 'target': 'derived' },
          { 'degrees': 50, 'id': 'chained', 'operation': 'hue-offset', 'priority': 2, 'relaxability': 'fixed', 'source': 'derived', 'target': 'chained' }
        ]
      }]
    },
    'roles': [
      { 'name': 'root', 'required': true },
      { 'name': 'derived' },
      { 'name': 'chained' }
    ]
  }, [RoleResolutionFixture.seed('root', 0.60, 0.10, 350)]);
  const derived = state.roles.derived;
  const chained = state.roles.chained;
  assert.ok(derived !== undefined && chained !== undefined);
  assert.ok(Math.abs(derived.oklch.h - 320) < 0.001);
  assert.ok(Math.abs(chained.oklch.h - 10) < 0.001);
});

void test('oklch-delta applies source-relative lightness and chroma inside target ranges', () => {
  const state = RoleResolutionFixture.run({
    'name': 'relative-lightness-chroma',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'root',
        'defaultMode': 'default',
        'id': 'family',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'default' }],
        'name': 'Family',
        'relationships': [{ 'chromaScale': 2, 'id': 'surface', 'lightnessOffset': 0.30, 'operation': 'oklch-delta', 'priority': 1, 'relaxability': 'fixed', 'source': 'root', 'target': 'surface' }]
      }]
    },
    'roles': [
      { 'name': 'root', 'required': true },
      { 'chromaRange': [0.05, 0.25], 'lightnessRange': [0.65, 0.75], 'name': 'surface' }
    ]
  }, [RoleResolutionFixture.seed('root', 0.60, 0.20, 100)]);
  const surface = state.roles.surface;
  assert.ok(surface !== undefined);
  assert.ok(Math.abs(surface.oklch.l - 0.75) < 0.001);
  assert.ok(Math.abs(surface.oklch.c - 0.25) < 0.001);
});

void test('a conformant Display-P3 role seed retains verbatim P3 metadata when role intent is applied', () => {
  const p3Candidate = intakeP3.parse('color(display-p3 0.9 0.2 0.1)');
  const p3Channels = p3Candidate.displayP3;
  assert.ok(p3Channels !== undefined, 'Display-P3 intake retains P3 channels');
  const hintedP3 = ColorRecordEntity.create({
    'alpha': p3Candidate.alpha,
    'displayP3': p3Channels,
    'hex': p3Candidate.hex,
    'hints': ColorHintsEntity.create({ 'role': 'accent' }),
    'oklch': p3Candidate.oklch,
    'rgb': p3Candidate.rgb,
    'sourceFormat': p3Candidate.sourceFormat
  });
  const state = RoleResolutionFixture.run({
    'name': 'p3-intent-preservation',
    'roles': [{
      'intent': 'accent',
      'name': 'accent',
      'required': true
    }]
  }, [hintedP3]);
  const accent = state.roles.accent;
  const statedSeed = state.colors.find((color) => {
    const result = color.hints?.role === 'accent';
    return result;
  });
  assert.strictEqual(accent, statedSeed, 'the hinted derived role retains the original record');
  assert.ok(accent !== undefined, 'the hinted Display-P3 role resolves');
  assert.deepStrictEqual(accent.displayP3, p3Candidate.displayP3, 'verbatim Display-P3 channels are preserved');
  assert.deepStrictEqual(accent.hints, hintedP3.hints, 'input intent remains exact');
});
