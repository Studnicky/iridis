/**
 * RequiredRoles.e2e — scenario-matrix suite.
 *
 * Subject: required-role enforcement in `resolve:roles`.
 *
 * resolve:roles must guarantee that every required role is populated AND that
 * the assigned color satisfies the role's declared lightnessRange, chromaRange,
 * and hueOffset constraints — even when no input color falls inside those
 * constraints. The engine nudges the closest candidate into range; when no
 * input colors exist at all it synthesizes from the constraints' centers.
 *
 * Cells:
 *   1. lightnessRange   — dark input nudged up, light input nudged down
 *   2. chromaRange      — vivid input desaturated into neutral range
 *   3. hueOffset        — hue forced to absolute target
 *   4. combined         — all dimensions clamped simultaneously
 *   5. synthesis        — zero input → synthesized from constraint centers
 *   6. optional-roles   — non-required with input nudged; zero input not synthesized
 */

import type { InputInterface, RoleSchemaInterfaceType } from '@studnicky/iridis';

import { Engine }                   from '@studnicky/iridis';
import { coreTasks }                from '@studnicky/iridis/tasks';
import assert                       from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class EngineFixture {
  static createFresh(): Engine {
    const engine = new Engine();
    for (const task of coreTasks) { engine.tasks.register(task); }
    return engine;
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — lightnessRange: input nudged into declared range
//
// A dark input assigned to a role requiring high lightness must be adjusted
// upward. A light input assigned to a role requiring low lightness must be
// adjusted downward.
// ---------------------------------------------------------------------------

type LightnessRangeInput = {
  readonly 'colors':  string[];
  readonly 'range':   [number, number];
  readonly 'roleName': string;
};
const lightnessRangeScenarios: readonly ScenarioInterface<LightnessRangeInput, { readonly 'l': number; readonly 'roleAssigned': boolean }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,           '[cell=1, scenario=nudge-up] no throw');
      assert.strictEqual(output!.roleAssigned, true,  '[cell=1, scenario=nudge-up] canvas role assigned');
      assert.ok(
        output!.l >= 0.92 && output!.l <= 1.0,
        `[cell=1, scenario=nudge-up] canvas.l must be in [0.92, 1.0]; got ${output!.l}`
      );
    },
    'input': { 'colors': ['#000000'], 'range': [0.92, 1.0], 'roleName': 'canvas' },
    'kind': 'happy',
    'name': 'dark input (#000000) nudged up into [0.92, 1.0]'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,           '[cell=1, scenario=nudge-down] no throw');
      assert.strictEqual(output!.roleAssigned, true,  '[cell=1, scenario=nudge-down] text role assigned');
      assert.ok(
        output!.l >= 0.05 && output!.l <= 0.15,
        `[cell=1, scenario=nudge-down] text.l must be in [0.05, 0.15]; got ${output!.l}`
      );
    },
    'input': { 'colors': ['#ffffff'], 'range': [0.05, 0.15], 'roleName': 'text' },
    'kind': 'happy',
    'name': 'light input (#ffffff) nudged down into [0.05, 0.15]'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,           '[cell=1, scenario=mid-grey] no throw');
      assert.strictEqual(output!.roleAssigned, true,  '[cell=1, scenario=mid-grey] mid role assigned');
      assert.ok(
        output!.l >= 0.4 && output!.l <= 0.6,
        `[cell=1, scenario=mid-grey] mid.l must be in [0.4, 0.6]; got ${output!.l}`
      );
    },
    'input': { 'colors': ['#808080'], 'range': [0.4, 0.6], 'roleName': 'mid' },
    'kind': 'edge',
    'name': 'mid-grey input nudged into [0.4, 0.6]'
  }
];

new ScenarioRunner<LightnessRangeInput, { readonly 'l': number; readonly 'roleAssigned': boolean }>(
  'RequiredRoles :: cell-1 :: lightnessRange',
  (input) => {
    const schema: RoleSchemaInterfaceType = {
      'contrastPairs': undefined,
      'description': undefined, 'name': 'lr-schema', 'roles': [{ 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': input.range, 'name': input.roleName, 'required': true }]
    };
    const engine = EngineFixture.createFresh();
    engine.pipeline(['intake:hex', 'resolve:roles']);
    const state = engine.run({ 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': schema, 'runtime': undefined });
    const role  = state.roles[input.roleName];
    return { 'l': role?.oklch.l ?? -1, 'roleAssigned': role !== undefined };
  }
).run(lightnessRangeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — chromaRange: vivid input desaturated into neutral range
//
// A highly saturated input (#ff0000) assigned to a role with chromaRange
// [0, 0.02] must be desaturated until chroma falls within the range.
// ---------------------------------------------------------------------------

type ChromaRangeInput = {
  readonly 'colors': string[];
  readonly 'range':  [number, number];
};
const chromaRangeScenarios: readonly ScenarioInterface<ChromaRangeInput, { readonly 'c': number; readonly 'roleAssigned': boolean }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,            '[cell=2, scenario=vivid-neutral] no throw');
      assert.strictEqual(output!.roleAssigned, true,   '[cell=2, scenario=vivid-neutral] neutral role assigned');
      assert.ok(
        output!.c >= 0 && output!.c <= 0.02,
        `[cell=2, scenario=vivid-neutral] neutral.c must be in [0, 0.02]; got ${output!.c}`
      );
    },
    'input': { 'colors': ['#ff0000'], 'range': [0, 0.02] },
    'kind': 'happy',
    'name': 'vivid #ff0000 nudged into neutral chromaRange [0, 0.02]'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,            '[cell=2, scenario=achromatic] no throw');
      assert.strictEqual(output!.roleAssigned, true,   '[cell=2, scenario=achromatic] neutral role assigned');
      assert.ok(
        output!.c >= 0 && output!.c <= 0.02,
        `[cell=2, scenario=achromatic] neutral.c already in [0, 0.02]; got ${output!.c}`
      );
    },
    'input': { 'colors': ['#808080'], 'range': [0, 0.02] },
    'kind': 'edge',
    'name': 'achromatic #808080 still in [0, 0.02] range (no nudge needed)'
  }
];

new ScenarioRunner<ChromaRangeInput, { readonly 'c': number; readonly 'roleAssigned': boolean }>(
  'RequiredRoles :: cell-2 :: chromaRange',
  (input) => {
    const schema: RoleSchemaInterfaceType = {
      'contrastPairs': undefined,
      'description': undefined, 'name': 'cr-schema', 'roles': [{ 'chromaRange': input.range, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'neutral', 'required': true }]
    };
    const engine = EngineFixture.createFresh();
    engine.pipeline(['intake:hex', 'resolve:roles']);
    const state = engine.run({ 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': schema, 'runtime': undefined });
    const role  = state.roles.neutral;
    return { 'c': role?.oklch.c ?? -1, 'roleAssigned': role !== undefined };
  }
).run(chromaRangeScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — hueOffset: assigned hue forced to absolute target
//
// hueOffset is treated as an absolute target hue. The assigned color's hue
// must equal the declared offset within floating-point tolerance.
// ---------------------------------------------------------------------------

interface HueOffsetInputInterface { readonly 'colors': InputInterface['colors']; readonly 'hueOffset': number }

const hueOffsetScenarios: readonly ScenarioInterface<HueOffsetInputInterface, { readonly 'h': number; readonly 'roleAssigned': boolean }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,           '[cell=3, scenario=red-to-green] no throw');
      assert.strictEqual(output!.roleAssigned, true,  '[cell=3, scenario=red-to-green] anchor assigned');
      assert.ok(
        Math.abs(output!.h - 142) < 0.01,
        `[cell=3, scenario=red-to-green] anchor.h must equal 142; got ${output!.h}`
      );
    },
    'input': { 'colors': ['#ff0000'], 'hueOffset': 142 },
    'kind': 'happy',
    'name': 'red input (#ff0000) forced to hueOffset=142 (green)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,           '[cell=3, scenario=already-at-target] no throw');
      assert.strictEqual(output!.roleAssigned, true,  '[cell=3, scenario=already-at-target] role assigned');
      assert.ok(
        Math.abs(output!.h - 200) < 0.5,
        `[cell=3, scenario=already-at-target] anchor.h ≈ 200; got ${output!.h}`
      );
    },
    'input': { 'colors': [{ 'c': 0.1, 'h': 200, 'l': 0.5 }], 'hueOffset': 200 },
    'kind': 'edge',
    'name': 'input already at hueOffset=200 requires no nudge'
  }
];

new ScenarioRunner<HueOffsetInputInterface, { readonly 'h': number; readonly 'roleAssigned': boolean }>(
  'RequiredRoles :: cell-3 :: hueOffset',
  (input) => {
    const schema: RoleSchemaInterfaceType = {
      'contrastPairs': undefined,
      'description': undefined, 'name': 'ho-schema', 'roles': [{ 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': input.hueOffset, 'intent': undefined, 'lightnessRange': undefined, 'name': 'anchor', 'required': true }]
    };
    const engine = EngineFixture.createFresh();
    engine.pipeline(['intake:any', 'resolve:roles']);
    const state = engine.run({ 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': schema, 'runtime': undefined });
    const role  = state.roles.anchor;
    return { 'h': role?.oklch.h ?? -1, 'roleAssigned': role !== undefined };
  }
).run(hueOffsetScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — combined constraints: all three dimensions clamped simultaneously
//
// A role with lightnessRange, chromaRange applied together must land inside
// both ranges simultaneously.
// ---------------------------------------------------------------------------

type CombinedInput = {
  readonly 'colors': string[];
  readonly 'cRange': [number, number];
  readonly 'lRange': [number, number];
};
const combinedScenarios: readonly ScenarioInterface<CombinedInput, { readonly 'c': number; readonly 'l': number; readonly 'roleAssigned': boolean }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,            '[cell=4, scenario=four-colors] no throw');
      assert.strictEqual(output!.roleAssigned, true,   '[cell=4, scenario=four-colors] tight role assigned');
      assert.ok(
        output!.l >= 0.40 && output!.l <= 0.50,
        `[cell=4, scenario=four-colors] l in [0.40, 0.50]; got ${output!.l}`
      );
      assert.ok(
        output!.c >= 0.05 && output!.c <= 0.10,
        `[cell=4, scenario=four-colors] c in [0.05, 0.10]; got ${output!.c}`
      );
    },
    'input': {
      'colors': ['#000000', '#ffffff', '#ff00ff', '#00ff00'],
      'cRange': [0.05, 0.10],
      'lRange': [0.40, 0.50]
    },
    'kind': 'happy',
    'name': 'four diverse colors clamped into tight [0.40-0.50, 0.05-0.10]'
  }
];

new ScenarioRunner<CombinedInput, { readonly 'c': number; readonly 'l': number; readonly 'roleAssigned': boolean }>(
  'RequiredRoles :: cell-4 :: combined-constraints',
  (input) => {
    const schema: RoleSchemaInterfaceType = {
      'contrastPairs': undefined,
      'description': undefined, 'name': 'cc-schema', 'roles': [{
        'chromaRange':    input.cRange,
        'derivedFrom': undefined,
        'description': undefined,
        'hue': undefined,
        'hueClamp': undefined,
        'hueOffset': undefined,
        'intent': undefined,
        'lightnessRange': input.lRange,
        'name':           'tight',
        'required':       true
      }]
    };
    const engine = EngineFixture.createFresh();
    engine.pipeline(['intake:hex', 'resolve:roles']);
    const state = engine.run({ 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': schema, 'runtime': undefined });
    const role  = state.roles.tight;
    return { 'c': role?.oklch.c ?? -1, 'l': role?.oklch.l ?? -1, 'roleAssigned': role !== undefined };
  }
).run(combinedScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — synthesis from constraint centers when no input colors
//
// When the input colors array is empty a required role with all three
// constraints must be synthesized to their center values. The synthesized
// role name must appear in state.metadata['core:rolesSynthesized']. A required role
// with no constraints still produces a synthesized record. A second role with
// a point range (l=0.5, c=0) round-trips its hex correctly.
// ---------------------------------------------------------------------------

const synthesisScenarios: readonly ScenarioInterface<
  { readonly 'cRange': [number, number]; readonly 'hueOffset': number; readonly 'lRange': [number, number] },
  {
    readonly 'c':            number;
    readonly 'h':            number;
    readonly 'hexIsValid':   boolean;
    readonly 'inSynthList':  boolean;
    readonly 'l':            number;
    readonly 'rgbRInRange':  boolean;
    readonly 'roleAssigned': boolean;
  }
>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,            '[cell=5, scenario=full-synthesis] no throw');
      assert.strictEqual(output!.roleAssigned, true,   '[cell=5, scenario=full-synthesis] synth role assigned');
      assert.ok(output!.l >= 0.6 && output!.l <= 0.8,         `[cell=5, scenario=full-synthesis] l in range; got ${output!.l}`);
      assert.ok(output!.c >= 0.10 && output!.c <= 0.15,       `[cell=5, scenario=full-synthesis] c in range; got ${output!.c}`);
      assert.ok(Math.abs(output!.h - 200) < 0.01,             `[cell=5, scenario=full-synthesis] h = 200; got ${output!.h}`);
      assert.strictEqual(output!.inSynthList, true,           '[cell=5, scenario=full-synthesis] rolesSynthesized includes synth');
      assert.strictEqual(output!.hexIsValid,  true,           '[cell=5, scenario=full-synthesis] hex is valid 6-digit lowercase');
      assert.strictEqual(output!.rgbRInRange, true,           '[cell=5, scenario=full-synthesis] rgb.r in [0..1]');
    },
    'input': { 'cRange': [0.10, 0.15], 'hueOffset': 200, 'lRange': [0.6, 0.8] },
    'kind': 'happy',
    'name': 'full constraints satisfied from centers with zero input colors'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,            '[cell=5, scenario=point-synthesis] no throw');
      assert.strictEqual(output!.roleAssigned, true,   '[cell=5, scenario=point-synthesis] role synthesized');
      assert.strictEqual(output!.hexIsValid,   true,  '[cell=5, scenario=point-synthesis] hex is valid 6-digit lowercase');
      assert.strictEqual(output!.rgbRInRange,  true,  '[cell=5, scenario=point-synthesis] rgb.r in [0..1]');
    },
    'input': { 'cRange': [0, 0], 'hueOffset': 0, 'lRange': [0.5, 0.5] },
    'kind': 'edge',
    'name': 'achromatic point (l=0.5, c=0) synthesized with valid hex round-trip'
  }
];

new ScenarioRunner<
  { readonly 'cRange': [number, number]; readonly 'hueOffset': number; readonly 'lRange': [number, number] },
  {
    readonly 'c':            number;
    readonly 'h':            number;
    readonly 'hexIsValid':   boolean;
    readonly 'inSynthList':  boolean;
    readonly 'l':            number;
    readonly 'rgbRInRange':  boolean;
    readonly 'roleAssigned': boolean;
  }
>(
  'RequiredRoles :: cell-5 :: synthesis',
  (input) => {
    const schema: RoleSchemaInterfaceType = {
      'contrastPairs': undefined,
      'description': undefined, 'name': 'synth-schema', 'roles': [{
        'chromaRange':    input.cRange,
        'derivedFrom': undefined,
        'description': undefined,
        'hue': undefined,
        'hueClamp': undefined,
        'hueOffset':      input.hueOffset,
        'intent': undefined,
        'lightnessRange': input.lRange,
        'name':           'synth',
        'required':       true
      }]
    };
    const engine = EngineFixture.createFresh();
    engine.pipeline(['intake:hex', 'resolve:roles']);
    const state = engine.run({ 'bypass': undefined, 'colors': [], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': schema, 'runtime': undefined });
    const role       = state.roles.synth;
    const synthList  = state.metadata['core:rolesSynthesized'];
    return {
      'c':            role?.oklch.c ?? -1,
      'h':            role?.oklch.h ?? -1,
      'hexIsValid':   typeof role?.hex === 'string' && /^#[0-9a-f]{6}$/.test(role.hex),
      'inSynthList':  Array.isArray(synthList) && (synthList as string[]).includes('synth'),
      'l':            role?.oklch.l ?? -1,
      'rgbRInRange':  role !== undefined && role.rgb.r >= 0 && role.rgb.r <= 1,
      'roleAssigned': role !== undefined
    };
  }
).run(synthesisScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — optional roles
//
// An optional role with colors present gets the closest candidate nudged into
// its range. An optional role with zero input colors must NOT be synthesized
// (synthesis is only for required roles).
// ---------------------------------------------------------------------------

type OptionalRoleInput = {
  readonly 'colors':  string[];
  readonly 'range':   [number, number];
};
const optionalRoleScenarios: readonly ScenarioInterface<OptionalRoleInput, { readonly 'l': number; readonly 'roleAssigned': boolean }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,            '[cell=6, scenario=optional-with-input] no throw');
      assert.strictEqual(output!.roleAssigned, true,   '[cell=6, scenario=optional-with-input] optional role assigned');
      assert.ok(
        output!.l >= 0.85 && output!.l <= 1.0,
        `[cell=6, scenario=optional-with-input] l in [0.85, 1.0]; got ${output!.l}`
      );
    },
    'input': { 'colors': ['#000000'], 'range': [0.85, 1.0] },
    'kind': 'happy',
    'name': 'optional role with input assigned and nudged into range'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,             '[cell=6, scenario=optional-no-input] no throw');
      assert.strictEqual(output!.roleAssigned, false,   '[cell=6, scenario=optional-no-input] optional role remains unassigned');
    },
    'input': { 'colors': [], 'range': [0.85, 1.0] },
    'kind': 'edge',
    'name': 'optional role with zero input is NOT synthesized'
  },
  {
    'assert': function(output, error) {
      // No throw expected; unhappy here means "the non-synthesis is the
      // expected non-happy outcome for an optional role without colors".
      assert.strictEqual(error, undefined,             '[cell=6, scenario=optional-unconstrained] no throw');
      assert.strictEqual(output!.roleAssigned, false,   '[cell=6, scenario=optional-unconstrained] not synthesized without input');
    },
    // Structurally: optional + zero input → no synthesis. This verifies the
    // required-only synthesis guarantee holds even with no constraints.
    'input': { 'colors': [], 'range': [0.5, 0.7] },
    'kind': 'unhappy',
    'name': 'optional role with empty range list still not synthesized on zero input'
  }
];

new ScenarioRunner<OptionalRoleInput, { readonly 'l': number; readonly 'roleAssigned': boolean }>(
  'RequiredRoles :: cell-6 :: optional-roles',
  (input) => {
    const schema: RoleSchemaInterfaceType = {
      'contrastPairs': undefined,
      'description': undefined, 'name': 'opt-schema', 'roles': [{ 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': input.range, 'name': 'maybe', 'required': false }]
    };
    const engine = EngineFixture.createFresh();
    engine.pipeline(['intake:hex', 'resolve:roles']);
    const state = engine.run({ 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': schema, 'runtime': undefined });
    const role  = state.roles.maybe;
    return { 'l': role?.oklch.l ?? -1, 'roleAssigned': role !== undefined };
  }
).run(optionalRoleScenarios);
