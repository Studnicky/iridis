/**
 * PandaPlugin e2e — scenario-matrix suite.
 *
 * Subject: `PandaPlugin` (plugin shape) + `emit:pandaTheme` (Panda CSS /
 * UnoCSS theme config generation task). Each cell covers one concern;
 * scenarios within each cell exhaust the happy / edge / unhappy matrix for
 * that concern.
 *
 * Cells:
 *   1. plugin-shape          — singleton identity, task manifest
 *   2. full token coverage   — every TOKEN_SOURCE entry resolves, both
 *                              configs carry a matching line per colors entry
 *   3. candidate fallback    — 2-deep and 3-deep fallback chains resolve to
 *                              the correct candidate's hex
 *   4. omission               — a token with no resolvable candidate is
 *                              absent from colors and from both configs
 *   5. determinism            — same input via two fresh engines produces
 *                              byte-identical colors/pandaConfig/unoConfig
 *   6. role coverage          — every winning candidate role's hex appears
 *                              in colors; shadowed fallback roles do not
 *   7. empty roles (edge)     — no roles resolved: colors is {}, both
 *                              configs are still well-formed, no throw
 *   8. missing prerequisite   — pipeline names emit:pandaTheme without
 *      task (unhappy)           adopting pandaPlugin: engine.pipeline() throws
 *   9. invalid input (unhappy) — non-hex color entry: engine.run() throws
 *                              before emit runs
 */

import type { InputInterface, RoleSchemaInterfaceType } from '@studnicky/iridis';
import type { JsonObjectType } from '@studnicky/types';

import { pandaPlugin }  from '@studnicky/iridis-panda';
import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import assert           from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';
import type { RoleSpecEntity } from '../entities/RoleSpecEntity.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { PandaThemeScenarioOutputEntity } from '../entities/PandaThemeScenarioOutputEntity.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class PandaTestFixture {
  static freshEngine(): Engine {
    const engine = new Engine();
    for (const t of coreTasks) {engine.tasks.register(t);}
    engine.adopt(pandaPlugin);
    return engine;
  }

  static pipeline(extra: readonly string[] = []): readonly string[] {
    return ['intake:hex', 'resolve:roles', ...extra, 'emit:pandaTheme'];
  }
}

class RoleSchemaFixture {
  static build(roleNames: readonly string[]): RoleSchemaInterfaceType {
    return {
      'contrastPairs': undefined,
      'description':   undefined,
      'name':          'test-schema',
      'roles':         roleNames.map((name) => {return {
        'chromaRange':    undefined,
        'derivedFrom':    undefined,
        'description':    undefined,
        'hue':            undefined,
        'hueClamp':       undefined,
        'hueOffset':      undefined,
        'intent':         undefined,
        'lightnessRange': undefined,
        'name':           name,
        'required':       true
      };})
    };
  }

  /**
   * Builds a role schema where each role carries a narrow `lightnessRange`
   * band centered on its spec's `lightness`. `resolve:roles` picks the
   * candidate closest to a role's range center by OKLCH distance; a role
   * with no lightnessRange/chromaRange/hueOffset at all has no center and
   * always collapses onto `state.colors[0]` (see
   * `RoleNudge.distanceToRoleCenter` in `ResolveRoles.ts`, which returns 0
   * for every candidate when all three are undefined). Distinct bands are
   * required whenever a scenario needs to prove that DIFFERENT roles
   * resolve to DIFFERENT candidates.
   */
  static buildDistinct(spec: readonly RoleSpecEntity.Type[]): RoleSchemaInterfaceType {
    return {
      'contrastPairs': undefined,
      'description':   undefined,
      'name':          'test-schema-distinct',
      'roles':         spec.map((entry) => {
        const band: [number, number] = [Math.max(0, entry.lightness - 0.015), Math.min(1, entry.lightness + 0.015)];
        return {
          'chromaRange':    undefined,
          'derivedFrom':    undefined,
          'description':    undefined,
          'hue':            undefined,
          'hueClamp':       undefined,
          'hueOffset':      undefined,
          'intent':         undefined,
          'lightnessRange': band,
          'name':           entry.name,
          'required':       true
        };
      })
    };
  }
}

class PandaScenarioOutput {
  static theme(value: JsonObjectType[string]): PandaThemeScenarioOutputEntity.Type {
    if (!PandaThemeScenarioOutputEntity.validate(value)) {
      throw new Error('outputs.panda:theme is invalid');
    }
    return value;
  }
}

type ThemeWithRolesOutput = {
  readonly 'panda':    PandaThemeScenarioOutputEntity.Type;
  readonly 'rolesHex': ReadonlyMap<string, string>;
};

class PandaThemeRunner {
  static run(colors: InputInterface['colors'], roles: RoleSchemaInterfaceType, pipeline: readonly string[] = PandaTestFixture.pipeline()): ThemeWithRolesOutput {
    const engine = PandaTestFixture.freshEngine();
    engine.pipeline(pipeline);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     roles,
      'runtime':   undefined
    });
    const rolesHex = new Map<string, string>();
    for (const [name, record] of Object.entries(state.roles)) {rolesHex.set(name, record.hex);}
    const themeOutput = state.outputs['panda:theme'];
    const panda = PandaScenarioOutput.theme(themeOutput);
    return { 'panda': panda, 'rolesHex': rolesHex };
  }
}

// Named specs for the two roles in TOKEN_SOURCE.surface's 3-deep chain
// (surface → bg-soft → background), reused both standalone (cell 3) and as
// members of FULL_TOKEN_ROLE_SPEC (cells 2/5/6) so the values are declared
// exactly once.
const BACKGROUND_ROLE_SPEC: RoleSpecEntity.Type = { 'hex': '#050505', 'lightness': 0.1149, 'name': 'background' };
const BG_SOFT_ROLE_SPEC:    RoleSpecEntity.Type = { 'hex': '#151515', 'lightness': 0.1957, 'name': 'bg-soft' };

// One role per TOKEN_SOURCE first candidate, plus BG_SOFT_ROLE_SPEC present
// but shadowed (surface's first candidate 'surface' already resolves, so
// bg-soft never wins). Twelve grayscale hexes with well-separated OKLCH
// lightness (measured via colorRecordFactory) give buildDistinct a
// non-overlapping band per role.
const FULL_TOKEN_ROLE_SPEC: readonly RoleSpecEntity.Type[] = [
  BACKGROUND_ROLE_SPEC,
  { 'hex': '#252525', 'lightness': 0.2645, 'name': 'border' },
  { 'hex': '#353535', 'lightness': 0.3290, 'name': 'error' },
  { 'hex': '#454545', 'lightness': 0.3904, 'name': 'info' },
  { 'hex': '#555555', 'lightness': 0.4495, 'name': 'brand' },
  { 'hex': '#656565', 'lightness': 0.5068, 'name': 'accent-alt' },
  { 'hex': '#757575', 'lightness': 0.5624, 'name': 'success' },
  { 'hex': '#858585', 'lightness': 0.6167, 'name': 'surface' },
  BG_SOFT_ROLE_SPEC,
  { 'hex': '#959595', 'lightness': 0.6698, 'name': 'text' },
  { 'hex': '#a5a5a5', 'lightness': 0.7219, 'name': 'text-subtle' },
  { 'hex': '#b5b5b5', 'lightness': 0.7731, 'name': 'warning' }
];
const FULL_TOKEN_COLORS: readonly string[] = FULL_TOKEN_ROLE_SPEC.map((entry) => { const result = entry.hex; return result; });
const FULL_TOKEN_ROLES: RoleSchemaInterfaceType = RoleSchemaFixture.buildDistinct(FULL_TOKEN_ROLE_SPEC);

// Winner role per token when FULL_TOKEN_ROLES is fully populated (mirrors
// TOKEN_SOURCE's first-candidate precedence); 'bg-soft' is deliberately
// excluded — it is shadowed by 'surface' and must never win.
const EXPECTED_TOKENS = ['background', 'border', 'error', 'info', 'primary', 'secondary', 'success', 'surface', 'text', 'textMuted', 'warning'];
const WINNING_ROLE_NAMES = ['background', 'border', 'error', 'info', 'brand', 'accent-alt', 'success', 'surface', 'text', 'text-subtle', 'warning'];

// ---------------------------------------------------------------------------
// Cell 1 — plugin shape
// ---------------------------------------------------------------------------

type PluginShapeInput = true;
type PluginShapeOutput = {
  readonly 'name':                 string;
  readonly 'satisfiesPluginShape': boolean;
  readonly 'taskNames':            readonly string[];
  readonly 'version':              string;
};

const pluginShapeScenarios: readonly ScenarioInterface<PluginShapeInput, PluginShapeOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=singleton] no throw');
      assert.strictEqual(output!.satisfiesPluginShape, true,  '[cell=1, scenario=singleton] satisfies PluginInterface shape');
      assert.strictEqual(output!.name,                 'panda', '[cell=1, scenario=singleton] name is panda');
      assert.strictEqual(output!.version,              '0.1.0', '[cell=1, scenario=singleton] version is 0.1.0');
    },
    'input': true,
    'kind': 'happy',
    'name': 'singleton satisfies the plugin shape with stable name and version'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-names] no throw');
      assert.deepStrictEqual(output!.taskNames, ['emit:pandaTheme'],
        '[cell=1, scenario=task-names] exactly one task returned: emit:pandaTheme');
    },
    'input': true,
    'kind': 'happy',
    'name': 'tasks() returns exactly [emit:pandaTheme]'
  }
  // unhappy: structurally impossible — plugin is a sealed singleton; no
  // invalid input exists for tasks() or shape inspection.
];

await new ScenarioRunner<PluginShapeInput, PluginShapeOutput>(
  'PandaPlugin :: cell-1 :: plugin-shape',
  (_input) => {
    return {
      'name':                 pandaPlugin.name,
      'satisfiesPluginShape': typeof pandaPlugin.tasks === 'function'
        && typeof pandaPlugin.schemas === 'function'
        && typeof pandaPlugin.name === 'string'
        && typeof pandaPlugin.version === 'string',
      'taskNames':            pandaPlugin.tasks().map((t) => { const result = t.name; return result; }),
      'version':              pandaPlugin.version
    };
  }
).run(pluginShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — full token coverage
//
// With every TOKEN_SOURCE first-candidate role present, all 11 tokens must
// appear in colors, and both pandaConfig/unoConfig must carry a
// correctly-formatted line for every colors entry — verified as a
// round-trip against the SAME colors map returned in the output, not by
// re-implementing the serializers.
// ---------------------------------------------------------------------------

type FullCoverageInput = true;
type FullCoverageOutput = {
  readonly 'panda': PandaThemeScenarioOutputEntity.Type;
};

const fullCoverageScenarios: readonly ScenarioInterface<FullCoverageInput, FullCoverageOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=all-tokens] no throw');
      const { colors, pandaConfig, unoConfig } = output!.panda;
      const colorEntries = Object.entries(colors);

      assert.deepStrictEqual([...Object.keys(colors)].sort(), [...EXPECTED_TOKENS].sort(),
        '[cell=2, scenario=all-tokens] all 11 tokens present in colors, no extras');

      for (const [key, hex] of colorEntries) {
        assert.ok(typeof hex === 'string', `[cell=2, scenario=all-tokens] colors.${key} is a string`);
        assert.ok(pandaConfig.includes(`'${key}': { value: '${hex}' },`),
          `[cell=2, scenario=all-tokens] pandaConfig carries a matching line for '${key}'`);
        assert.ok(unoConfig.includes(`'${key}': '${hex}',`),
          `[cell=2, scenario=all-tokens] unoConfig carries a matching line for '${key}'`);
      }

      const pandaValueLines = (pandaConfig.match(/'\S+': \{ value: '#[0-9a-f]{6}' \},/g) ?? []).length;
      const unoValueLines   = (unoConfig.match(/'\S+': '#[0-9a-f]{6}',/g) ?? []).length;
      assert.strictEqual(pandaValueLines, colorEntries.length,
        '[cell=2, scenario=all-tokens] pandaConfig contains no lines beyond the colors entries');
      assert.strictEqual(unoValueLines, colorEntries.length,
        '[cell=2, scenario=all-tokens] unoConfig contains no lines beyond the colors entries');
    },
    'input': true,
    'kind': 'happy',
    'name': 'every TOKEN_SOURCE first candidate resolves into colors and both configs'
  }
];

await new ScenarioRunner<FullCoverageInput, FullCoverageOutput>(
  'PandaPlugin :: cell-2 :: full-token-coverage',
  (_input) => {
    const run = PandaThemeRunner.run(FULL_TOKEN_COLORS, FULL_TOKEN_ROLES);
    return { 'panda': run.panda };
  }
).run(fullCoverageScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — candidate fallback
//
// TOKEN_SOURCE candidate chains are tried in order; the first present role
// wins. This cell proves both a 2-deep chain (secondary: accent-alt →
// brand) and the middle rung of a 3-deep chain (surface: surface →
// bg-soft → background).
// ---------------------------------------------------------------------------

interface CandidateFallbackInputInterface {
  readonly 'roleSpec': readonly RoleSpecEntity.Type[];
}
type CandidateFallbackOutput = {
  readonly 'panda':    PandaThemeScenarioOutputEntity.Type;
  readonly 'rolesHex': ReadonlyMap<string, string>;
};

const candidateFallbackScenarios: readonly ScenarioInterface<CandidateFallbackInputInterface, CandidateFallbackOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=secondary-2deep] no throw');
      assert.strictEqual(output!.panda.colors.secondary, output!.rolesHex.get('brand'),
        "[cell=3, scenario=secondary-2deep] secondary falls back to 'brand' when 'accent-alt' is absent");
    },
    'input': { 'roleSpec': [{ 'hex': '#7c3aed', 'lightness': 0.5, 'name': 'brand' }] },
    'kind': 'happy',
    'name': "secondary token falls back from missing 'accent-alt' to 'brand'"
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=surface-3deep] no throw');
      assert.strictEqual(output!.panda.colors.surface, output!.rolesHex.get('bg-soft'),
        "[cell=3, scenario=surface-3deep] surface resolves to 'bg-soft' (middle rung) when 'surface' is absent");
      assert.notStrictEqual(output!.panda.colors.surface, output!.rolesHex.get('background'),
        '[cell=3, scenario=surface-3deep] surface does NOT fall through to the third-rung background');
    },
    'input': { 'roleSpec': [BACKGROUND_ROLE_SPEC, BG_SOFT_ROLE_SPEC] },
    'kind': 'happy',
    'name': "surface token resolves the middle rung 'bg-soft' when 'surface' is absent"
  }
];

await new ScenarioRunner<CandidateFallbackInputInterface, CandidateFallbackOutput>(
  'PandaPlugin :: cell-3 :: candidate-fallback',
  (input) => {
    const colors = input.roleSpec.map((entry) => { const result = entry.hex; return result; });
    const roles  = RoleSchemaFixture.buildDistinct(input.roleSpec);
    const run    = PandaThemeRunner.run(colors, roles);
    return { 'panda': run.panda, 'rolesHex': run.rolesHex };
  }
).run(candidateFallbackScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — omission
//
// A token whose sole candidate (or every candidate in its chain) is absent
// from state.roles is omitted entirely from colors — not defaulted — and
// therefore absent from both serialized configs.
// ---------------------------------------------------------------------------

type OmissionInput = true;
type OmissionOutput = {
  readonly 'panda': PandaThemeScenarioOutputEntity.Type;
};

const omissionScenarios: readonly ScenarioInterface<OmissionInput, OmissionOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=error-omitted] no throw');
      const { colors, pandaConfig, unoConfig } = output!.panda;
      assert.ok(!('error' in colors), "[cell=4, scenario=error-omitted] 'error' key absent from colors");
      assert.ok(!pandaConfig.includes("'error':"), "[cell=4, scenario=error-omitted] pandaConfig has no 'error' line");
      assert.ok(!unoConfig.includes("'error':"),   "[cell=4, scenario=error-omitted] unoConfig has no 'error' line");
      assert.ok('background' in colors && 'text' in colors,
        '[cell=4, scenario=error-omitted] present roles still resolve their tokens');
    },
    'input': true,
    'kind': 'happy',
    'name': "token with no resolvable candidate ('error') is omitted from colors and both configs"
  }
];

await new ScenarioRunner<OmissionInput, OmissionOutput>(
  'PandaPlugin :: cell-4 :: omission',
  (_input) => {
    const run = PandaThemeRunner.run(['#0f172a', '#111827'], RoleSchemaFixture.build(['background', 'text']));
    return { 'panda': run.panda };
  }
).run(omissionScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — determinism
//
// The same input driven through two independently constructed engines must
// produce byte-identical colors, pandaConfig, and unoConfig.
// ---------------------------------------------------------------------------

type DeterminismInput = true;

const determinismScenarios: readonly ScenarioInterface<DeterminismInput, boolean>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=two-engines] no throw');
      assert.strictEqual(output, true, '[cell=5, scenario=two-engines] both runs produced identical output');
    },
    'input': true,
    'kind': 'happy',
    'name': 'identical input through two fresh engines produces byte-identical theme output'
  }
];

await new ScenarioRunner<DeterminismInput, boolean>(
  'PandaPlugin :: cell-5 :: determinism',
  (_input) => {
    const first  = PandaThemeRunner.run(FULL_TOKEN_COLORS, FULL_TOKEN_ROLES).panda;
    const second = PandaThemeRunner.run(FULL_TOKEN_COLORS, FULL_TOKEN_ROLES).panda;
    assert.deepStrictEqual(first.colors, second.colors, '[cell=5] colors match across runs');
    assert.strictEqual(first.pandaConfig, second.pandaConfig, '[cell=5] pandaConfig matches across runs');
    assert.strictEqual(first.unoConfig, second.unoConfig, '[cell=5] unoConfig matches across runs');
    return true;
  }
).run(determinismScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — role coverage
//
// Every role that wins a TOKEN_SOURCE candidate chain must have its hex
// value present among Object.values(colors); a role present in the schema
// but shadowed by an earlier candidate ('bg-soft', shadowed by 'surface')
// must NOT appear.
// ---------------------------------------------------------------------------

type RoleCoverageInput = true;
type RoleCoverageOutput = {
  readonly 'panda':    PandaThemeScenarioOutputEntity.Type;
  readonly 'rolesHex': ReadonlyMap<string, string>;
};

const roleCoverageScenarios: readonly ScenarioInterface<RoleCoverageInput, RoleCoverageOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=winners-present] no throw');
      const values = new Set(Object.values(output!.panda.colors));
      for (const roleName of WINNING_ROLE_NAMES) {
        assert.ok(values.has(output!.rolesHex.get(roleName)!),
          `[cell=6, scenario=winners-present] winning role '${roleName}' hex present in colors values`);
      }
    },
    'input': true,
    'kind': 'happy',
    'name': "every winning candidate role's hex appears as a value in colors"
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=shadowed-absent] no throw');
      const values = Object.values(output!.panda.colors);
      assert.ok(!values.includes(output!.rolesHex.get('bg-soft')!),
        "[cell=6, scenario=shadowed-absent] shadowed role 'bg-soft' hex does NOT appear in colors values");
    },
    'input': true,
    'kind': 'edge',
    'name': "shadowed fallback role ('bg-soft') never surfaces as a colors value"
  }
];

await new ScenarioRunner<RoleCoverageInput, RoleCoverageOutput>(
  'PandaPlugin :: cell-6 :: role-coverage',
  (_input) => {
    const run = PandaThemeRunner.run(FULL_TOKEN_COLORS, FULL_TOKEN_ROLES);
    return { 'panda': run.panda, 'rolesHex': run.rolesHex };
  }
).run(roleCoverageScenarios);

// ---------------------------------------------------------------------------
// Cell 7 — edge: empty roles
//
// No candidate colors and an empty role schema resolve to state.roles = {};
// colors is {}; both configs are still well-formed, empty-body
// `defineConfig({...})` module strings, and emit does not throw.
// ---------------------------------------------------------------------------

type EmptyRolesInput = true;
type EmptyRolesOutput = {
  readonly 'panda': PandaThemeScenarioOutputEntity.Type;
};

const emptyRolesScenarios: readonly ScenarioInterface<EmptyRolesInput, EmptyRolesOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=no-roles] no throw');
      const { colors, pandaConfig, unoConfig } = output!.panda;
      assert.deepStrictEqual(colors, {}, '[cell=7, scenario=no-roles] colors is an empty object');
      assert.ok(pandaConfig.startsWith('export default defineConfig({'),
        '[cell=7, scenario=no-roles] pandaConfig still opens with defineConfig');
      assert.ok(pandaConfig.trimEnd().endsWith('});'),
        '[cell=7, scenario=no-roles] pandaConfig still closes the module');
      assert.ok(!pandaConfig.includes('{ value:'),
        '[cell=7, scenario=no-roles] pandaConfig has no token value lines');
      assert.ok(unoConfig.startsWith('export default defineConfig({'),
        '[cell=7, scenario=no-roles] unoConfig still opens with defineConfig');
      assert.ok(unoConfig.trimEnd().endsWith('});'),
        '[cell=7, scenario=no-roles] unoConfig still closes the module');
    },
    'input': true,
    'kind': 'edge',
    'name': 'no roles resolved produces empty colors and well-formed empty-body configs'
  }
];

await new ScenarioRunner<EmptyRolesInput, EmptyRolesOutput>(
  'PandaPlugin :: cell-7 :: empty-roles',
  (_input) => {
    const run = PandaThemeRunner.run([], {
      'contrastPairs': undefined,
      'description':   undefined,
      'name':          'empty',
      'roles':         []
    });
    return { 'panda': run.panda };
  }
).run(emptyRolesScenarios);

// ---------------------------------------------------------------------------
// Cell 8 — unhappy: missing prerequisite task
//
// engine.pipeline() throws synchronously when a named task was never
// registered — reachable here by never adopting pandaPlugin.
// ---------------------------------------------------------------------------

type MissingTaskInput = true;

const missingTaskScenarios: readonly ScenarioInterface<MissingTaskInput, undefined>[] = [
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=unadopted-plugin] engine.pipeline throws');
      assert.match(error.message, /not registered/i,
        '[cell=8, scenario=unadopted-plugin] error names the unregistered task');
    },
    'input': true,
    'kind': 'unhappy',
    'name': "engine.pipeline(['emit:pandaTheme']) throws when pandaPlugin was never adopted"
  }
];

await new ScenarioRunner<MissingTaskInput, undefined>(
  'PandaPlugin :: cell-8 :: missing-prerequisite-task',
  (_input) => {
    const engine = new Engine();
    for (const t of coreTasks) {engine.tasks.register(t);}
    engine.pipeline(['emit:pandaTheme']);
    return undefined;
  }
).run(missingTaskScenarios);

// ---------------------------------------------------------------------------
// Cell 9 — unhappy: invalid input
//
// intake:hex throws synchronously on a non-hex entry, before emit:pandaTheme
// ever runs.
// ---------------------------------------------------------------------------

type InvalidInputInput = true;

const invalidInputScenarios: readonly ScenarioInterface<InvalidInputInput, undefined>[] = [
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=9, scenario=non-hex-color] engine.run throws');
    },
    'input': true,
    'kind': 'unhappy',
    'name': 'non-hex color entry throws before emit:pandaTheme runs'
  }
];

await new ScenarioRunner<InvalidInputInput, undefined>(
  'PandaPlugin :: cell-9 :: invalid-input',
  (_input) => {
    const engine = PandaTestFixture.freshEngine();
    engine.pipeline(PandaTestFixture.pipeline());
    engine.run({
      'bypass':    undefined,
      'colors':    ['not-a-hex-color'],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     RoleSchemaFixture.build(['brand']),
      'runtime':   undefined
    });
    return undefined;
  }
).run(invalidInputScenarios);
