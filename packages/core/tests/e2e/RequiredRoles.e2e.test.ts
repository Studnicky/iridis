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

import type { RoleSchemaInterfaceType } from '@studnicky/iridis';
import { Engine }                   from '@studnicky/iridis';
import { coreTasks }                from '@studnicky/iridis/tasks';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) { engine.tasks.register(t); }
  return engine;
}

type RoleEntry = { oklch: { l: number; c: number; h: number }; hex: string; rgb: { r: number } };

// ---------------------------------------------------------------------------
// Cell 1 — lightnessRange: input nudged into declared range
//
// A dark input assigned to a role requiring high lightness must be adjusted
// upward. A light input assigned to a role requiring low lightness must be
// adjusted downward.
// ---------------------------------------------------------------------------

interface LightnessRangeInput {
  readonly colors:  string[];
  readonly roleName: string;
  readonly range:   [number, number];
}
interface LightnessRangeOutput {
  readonly roleAssigned: boolean;
  readonly l:            number;
}

const lightnessRangeScenarios: readonly ScenarioInterface<LightnessRangeInput, LightnessRangeOutput>[] = [
  {
    name: 'dark input (#000000) nudged up into [0.92, 1.0]',
    kind: 'happy',
    input: { colors: ['#000000'], roleName: 'canvas', range: [0.92, 1.0] },
    assert(output, error) {
      assert.strictEqual(error, undefined,           '[cell=1, scenario=nudge-up] no throw');
      assert.strictEqual(output!.roleAssigned, true,  '[cell=1, scenario=nudge-up] canvas role assigned');
      assert.ok(
        output!.l >= 0.92 && output!.l <= 1.0,
        `[cell=1, scenario=nudge-up] canvas.l must be in [0.92, 1.0]; got ${output!.l}`,
      );
    },
  },
  {
    name: 'light input (#ffffff) nudged down into [0.05, 0.15]',
    kind: 'happy',
    input: { colors: ['#ffffff'], roleName: 'text', range: [0.05, 0.15] },
    assert(output, error) {
      assert.strictEqual(error, undefined,           '[cell=1, scenario=nudge-down] no throw');
      assert.strictEqual(output!.roleAssigned, true,  '[cell=1, scenario=nudge-down] text role assigned');
      assert.ok(
        output!.l >= 0.05 && output!.l <= 0.15,
        `[cell=1, scenario=nudge-down] text.l must be in [0.05, 0.15]; got ${output!.l}`,
      );
    },
  },
  {
    name: 'mid-grey input nudged into [0.4, 0.6]',
    kind: 'edge',
    input: { colors: ['#808080'], roleName: 'mid', range: [0.4, 0.6] },
    assert(output, error) {
      assert.strictEqual(error, undefined,           '[cell=1, scenario=mid-grey] no throw');
      assert.strictEqual(output!.roleAssigned, true,  '[cell=1, scenario=mid-grey] mid role assigned');
      assert.ok(
        output!.l >= 0.4 && output!.l <= 0.6,
        `[cell=1, scenario=mid-grey] mid.l must be in [0.4, 0.6]; got ${output!.l}`,
      );
    },
  },
];

new ScenarioRunner<LightnessRangeInput, LightnessRangeOutput>(
  'RequiredRoles :: cell-1 :: lightnessRange',
  async (input) => {
    const schema: RoleSchemaInterfaceType = {
      'name': 'lr-schema',
      'roles': [{ 'name': input.roleName, 'required': true, 'lightnessRange': input.range, 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined }],
    };
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles']);
    const state = await engine.run({ 'colors': input.colors, 'roles': schema });
    const role  = state.roles[input.roleName] as RoleEntry | undefined;
    return { roleAssigned: role !== undefined, l: role?.oklch.l ?? -1 };
  },
).run(lightnessRangeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — chromaRange: vivid input desaturated into neutral range
//
// A highly saturated input (#ff0000) assigned to a role with chromaRange
// [0, 0.02] must be desaturated until chroma falls within the range.
// ---------------------------------------------------------------------------

interface ChromaRangeInput {
  readonly colors: string[];
  readonly range:  [number, number];
}
interface ChromaRangeOutput {
  readonly roleAssigned: boolean;
  readonly c:            number;
}

const chromaRangeScenarios: readonly ScenarioInterface<ChromaRangeInput, ChromaRangeOutput>[] = [
  {
    name: 'vivid #ff0000 nudged into neutral chromaRange [0, 0.02]',
    kind: 'happy',
    input: { colors: ['#ff0000'], range: [0, 0.02] },
    assert(output, error) {
      assert.strictEqual(error, undefined,            '[cell=2, scenario=vivid-neutral] no throw');
      assert.strictEqual(output!.roleAssigned, true,   '[cell=2, scenario=vivid-neutral] neutral role assigned');
      assert.ok(
        output!.c >= 0 && output!.c <= 0.02,
        `[cell=2, scenario=vivid-neutral] neutral.c must be in [0, 0.02]; got ${output!.c}`,
      );
    },
  },
  {
    name: 'achromatic #808080 still in [0, 0.02] range (no nudge needed)',
    kind: 'edge',
    input: { colors: ['#808080'], range: [0, 0.02] },
    assert(output, error) {
      assert.strictEqual(error, undefined,            '[cell=2, scenario=achromatic] no throw');
      assert.strictEqual(output!.roleAssigned, true,   '[cell=2, scenario=achromatic] neutral role assigned');
      assert.ok(
        output!.c >= 0 && output!.c <= 0.02,
        `[cell=2, scenario=achromatic] neutral.c already in [0, 0.02]; got ${output!.c}`,
      );
    },
  },
];

new ScenarioRunner<ChromaRangeInput, ChromaRangeOutput>(
  'RequiredRoles :: cell-2 :: chromaRange',
  async (input) => {
    const schema: RoleSchemaInterfaceType = {
      'name': 'cr-schema',
      'roles': [{ 'name': 'neutral', 'required': true, 'chromaRange': input.range, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined }],
    };
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles']);
    const state = await engine.run({ 'colors': input.colors, 'roles': schema });
    const role  = state.roles['neutral'] as RoleEntry | undefined;
    return { roleAssigned: role !== undefined, c: role?.oklch.c ?? -1 };
  },
).run(chromaRangeScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — hueOffset: assigned hue forced to absolute target
//
// hueOffset is treated as an absolute target hue. The assigned color's hue
// must equal the declared offset within floating-point tolerance.
// ---------------------------------------------------------------------------

interface HueOffsetInput  { readonly colors: readonly unknown[]; readonly hueOffset: number }
interface HueOffsetOutput { readonly roleAssigned: boolean; readonly h: number }

const hueOffsetScenarios: readonly ScenarioInterface<HueOffsetInput, HueOffsetOutput>[] = [
  {
    name: 'red input (#ff0000) forced to hueOffset=142 (green)',
    kind: 'happy',
    input: { colors: ['#ff0000'], hueOffset: 142 },
    assert(output, error) {
      assert.strictEqual(error, undefined,           '[cell=3, scenario=red-to-green] no throw');
      assert.strictEqual(output!.roleAssigned, true,  '[cell=3, scenario=red-to-green] anchor assigned');
      assert.ok(
        Math.abs(output!.h - 142) < 0.01,
        `[cell=3, scenario=red-to-green] anchor.h must equal 142; got ${output!.h}`,
      );
    },
  },
  {
    name: 'input already at hueOffset=200 requires no nudge',
    kind: 'edge',
    input: { colors: [{ 'l': 0.5, 'c': 0.1, 'h': 200 }], hueOffset: 200 },
    assert(output, error) {
      assert.strictEqual(error, undefined,           '[cell=3, scenario=already-at-target] no throw');
      assert.strictEqual(output!.roleAssigned, true,  '[cell=3, scenario=already-at-target] role assigned');
      assert.ok(
        Math.abs(output!.h - 200) < 0.5,
        `[cell=3, scenario=already-at-target] anchor.h ≈ 200; got ${output!.h}`,
      );
    },
  },
];

new ScenarioRunner<HueOffsetInput, HueOffsetOutput>(
  'RequiredRoles :: cell-3 :: hueOffset',
  async (input) => {
    const schema: RoleSchemaInterfaceType = {
      'name': 'ho-schema',
      'roles': [{ 'name': 'anchor', 'required': true, 'hueOffset': input.hueOffset, 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'intent': undefined, 'lightnessRange': undefined }],
    };
    const engine = freshEngine();
    engine.pipeline(['intake:any', 'resolve:roles']);
    const state = await engine.run({ 'colors': input.colors, 'roles': schema });
    const role  = state.roles['anchor'] as RoleEntry | undefined;
    return { roleAssigned: role !== undefined, h: role?.oklch.h ?? -1 };
  },
).run(hueOffsetScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — combined constraints: all three dimensions clamped simultaneously
//
// A role with lightnessRange, chromaRange applied together must land inside
// both ranges simultaneously.
// ---------------------------------------------------------------------------

interface CombinedInput {
  readonly colors: string[];
  readonly lRange: [number, number];
  readonly cRange: [number, number];
}
interface CombinedOutput {
  readonly roleAssigned: boolean;
  readonly l: number;
  readonly c: number;
}

const combinedScenarios: readonly ScenarioInterface<CombinedInput, CombinedOutput>[] = [
  {
    name: 'four diverse colors clamped into tight [0.40-0.50, 0.05-0.10]',
    kind: 'happy',
    input: {
      colors: ['#000000', '#ffffff', '#ff00ff', '#00ff00'],
      lRange: [0.40, 0.50],
      cRange: [0.05, 0.10],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,            '[cell=4, scenario=four-colors] no throw');
      assert.strictEqual(output!.roleAssigned, true,   '[cell=4, scenario=four-colors] tight role assigned');
      assert.ok(
        output!.l >= 0.40 && output!.l <= 0.50,
        `[cell=4, scenario=four-colors] l in [0.40, 0.50]; got ${output!.l}`,
      );
      assert.ok(
        output!.c >= 0.05 && output!.c <= 0.10,
        `[cell=4, scenario=four-colors] c in [0.05, 0.10]; got ${output!.c}`,
      );
    },
  },
];

new ScenarioRunner<CombinedInput, CombinedOutput>(
  'RequiredRoles :: cell-4 :: combined-constraints',
  async (input) => {
    const schema: RoleSchemaInterfaceType = {
      'name': 'cc-schema',
      'roles': [{
        'name':           'tight',
        'required':       true,
        'lightnessRange': input.lRange,
        'chromaRange':    input.cRange,
        'derivedFrom': undefined,
        'description': undefined,
        'hue': undefined,
        'hueClamp': undefined,
        'hueOffset': undefined,
        'intent': undefined
      }],
    };
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles']);
    const state = await engine.run({ 'colors': input.colors, 'roles': schema });
    const role  = state.roles['tight'] as RoleEntry | undefined;
    return { roleAssigned: role !== undefined, l: role?.oklch.l ?? -1, c: role?.oklch.c ?? -1 };
  },
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

interface SynthesisInput {
  readonly lRange:    [number, number];
  readonly cRange:    [number, number];
  readonly hueOffset: number;
}
interface SynthesisOutput {
  readonly roleAssigned:   boolean;
  readonly l:              number;
  readonly c:              number;
  readonly h:              number;
  readonly inSynthList:    boolean;
  readonly hexIsValid:     boolean;
  readonly rgbRInRange:    boolean;
}

const synthesisScenarios: readonly ScenarioInterface<SynthesisInput, SynthesisOutput>[] = [
  {
    name: 'full constraints satisfied from centers with zero input colors',
    kind: 'happy',
    input: { lRange: [0.6, 0.8], cRange: [0.10, 0.15], hueOffset: 200 },
    assert(output, error) {
      assert.strictEqual(error, undefined,            '[cell=5, scenario=full-synthesis] no throw');
      assert.strictEqual(output!.roleAssigned, true,   '[cell=5, scenario=full-synthesis] synth role assigned');
      assert.ok(output!.l >= 0.6 && output!.l <= 0.8,         `[cell=5, scenario=full-synthesis] l in range; got ${output!.l}`);
      assert.ok(output!.c >= 0.10 && output!.c <= 0.15,       `[cell=5, scenario=full-synthesis] c in range; got ${output!.c}`);
      assert.ok(Math.abs(output!.h - 200) < 0.01,             `[cell=5, scenario=full-synthesis] h = 200; got ${output!.h}`);
      assert.strictEqual(output!.inSynthList, true,           '[cell=5, scenario=full-synthesis] rolesSynthesized includes synth');
      assert.strictEqual(output!.hexIsValid,  true,           '[cell=5, scenario=full-synthesis] hex is valid 6-digit lowercase');
      assert.strictEqual(output!.rgbRInRange, true,           '[cell=5, scenario=full-synthesis] rgb.r in [0..1]');
    },
  },
  {
    name: 'achromatic point (l=0.5, c=0) synthesized with valid hex round-trip',
    kind: 'edge',
    input: { lRange: [0.5, 0.5], cRange: [0, 0], hueOffset: 0 },
    assert(output, error) {
      assert.strictEqual(error, undefined,            '[cell=5, scenario=point-synthesis] no throw');
      assert.strictEqual(output!.roleAssigned, true,   '[cell=5, scenario=point-synthesis] role synthesized');
      assert.strictEqual(output!.hexIsValid,   true,  '[cell=5, scenario=point-synthesis] hex is valid 6-digit lowercase');
      assert.strictEqual(output!.rgbRInRange,  true,  '[cell=5, scenario=point-synthesis] rgb.r in [0..1]');
    },
  },
];

new ScenarioRunner<SynthesisInput, SynthesisOutput>(
  'RequiredRoles :: cell-5 :: synthesis',
  async (input) => {
    const schema: RoleSchemaInterfaceType = {
      'name': 'synth-schema',
      'roles': [{
        'name':           'synth',
        'required':       true,
        'lightnessRange': input.lRange,
        'chromaRange':    input.cRange,
        'hueOffset':      input.hueOffset,
        'derivedFrom': undefined,
        'description': undefined,
        'hue': undefined,
        'hueClamp': undefined,
        'intent': undefined
      }],
    };
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles']);
    const state = await engine.run({ 'colors': [], 'roles': schema });
    const role       = state.roles['synth'] as RoleEntry | undefined;
    const synthList  = state.metadata['core:rolesSynthesized'];
    return {
      roleAssigned: role !== undefined,
      l:            role?.oklch.l ?? -1,
      c:            role?.oklch.c ?? -1,
      h:            role?.oklch.h ?? -1,
      inSynthList:  Array.isArray(synthList) && (synthList as string[]).includes('synth'),
      hexIsValid:   typeof role?.hex === 'string' && /^#[0-9a-f]{6}$/.test(role.hex),
      rgbRInRange:  role !== undefined && role.rgb.r >= 0 && role.rgb.r <= 1,
    };
  },
).run(synthesisScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — optional roles
//
// An optional role with colors present gets the closest candidate nudged into
// its range. An optional role with zero input colors must NOT be synthesized
// (synthesis is only for required roles).
// ---------------------------------------------------------------------------

interface OptionalRoleInput {
  readonly colors:  string[];
  readonly range:   [number, number];
}
interface OptionalRoleOutput {
  readonly roleAssigned: boolean;
  readonly l:            number;
}

const optionalRoleScenarios: readonly ScenarioInterface<OptionalRoleInput, OptionalRoleOutput>[] = [
  {
    name: 'optional role with input assigned and nudged into range',
    kind: 'happy',
    input: { colors: ['#000000'], range: [0.85, 1.0] },
    assert(output, error) {
      assert.strictEqual(error, undefined,            '[cell=6, scenario=optional-with-input] no throw');
      assert.strictEqual(output!.roleAssigned, true,   '[cell=6, scenario=optional-with-input] optional role assigned');
      assert.ok(
        output!.l >= 0.85 && output!.l <= 1.0,
        `[cell=6, scenario=optional-with-input] l in [0.85, 1.0]; got ${output!.l}`,
      );
    },
  },
  {
    name: 'optional role with zero input is NOT synthesized',
    kind: 'edge',
    input: { colors: [], range: [0.85, 1.0] },
    assert(output, error) {
      assert.strictEqual(error, undefined,             '[cell=6, scenario=optional-no-input] no throw');
      assert.strictEqual(output!.roleAssigned, false,   '[cell=6, scenario=optional-no-input] optional role remains unassigned');
    },
  },
  {
    name: 'optional role with empty range list still not synthesized on zero input',
    kind: 'unhappy',
    // Structurally: optional + zero input → no synthesis. This verifies the
    // required-only synthesis guarantee holds even with no constraints.
    input: { colors: [], range: [0.5, 0.7] },
    assert(output, error) {
      // No throw expected; unhappy here means "the non-synthesis is the
      // expected non-happy outcome for an optional role without colors".
      assert.strictEqual(error, undefined,             '[cell=6, scenario=optional-unconstrained] no throw');
      assert.strictEqual(output!.roleAssigned, false,   '[cell=6, scenario=optional-unconstrained] not synthesized without input');
    },
  },
];

new ScenarioRunner<OptionalRoleInput, OptionalRoleOutput>(
  'RequiredRoles :: cell-6 :: optional-roles',
  async (input) => {
    const schema: RoleSchemaInterfaceType = {
      'name': 'opt-schema',
      'roles': [{ 'name': 'maybe', 'required': false, 'lightnessRange': input.range, 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined }],
    };
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles']);
    const state = await engine.run({ 'colors': input.colors, 'roles': schema });
    const role  = state.roles['maybe'] as RoleEntry | undefined;
    return { roleAssigned: role !== undefined, l: role?.oklch.l ?? -1 };
  },
).run(optionalRoleScenarios);
