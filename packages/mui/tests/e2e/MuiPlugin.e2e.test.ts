/**
 * MuiPlugin e2e — scenario-matrix suite.
 *
 * Subject: `MuiPlugin` (plugin shape) + `emit:muiTheme` (MUI `createTheme()`
 * palette emission task). Each cell covers one concern; scenarios within
 * each cell exhaust the happy / edge / unhappy matrix for that concern.
 *
 * Cells:
 *   1.  plugin-shape                 — singleton identity, task manifest
 *   2.  full-palette-build           — every family/section populated from resolved role hex
 *   3.  default-shade-derivation     — no core:variantConfig (or no derive:variant at all): light/dark are still derived, distinct, and correctly ordered around main
 *   4.  custom-variant               — core:variantConfig naming s300/s700: light/dark diverge from main and take precedence over derivation
 *   5.  fallback-chains              — secondary/warning/info/success fall back to the brand family
 *   6.  omission                     — a missing base role omits its family, not defaulted
 *   7.  mode-from-framing            — runtime.framing drives palette.mode
 *   8.  determinism                  — identical input produces identical output across independent engines
 *   9.  empty-roles                  — no resolvable roles leaves palette with only mode
 *   10. unhappy: missing-prerequisite-task — pipeline() throws when muiPlugin was never adopted
 *   11. unhappy: invalid-input             — engine.run() throws on a non-hex color entry
 */

import type {
  ColorRecordInterfaceType,
  InputInterface,
  PaletteStateInterface,
  RoleDefinitionInterfaceType,
  RoleSchemaInterfaceType
} from '@studnicky/iridis';
import type { JsonObjectType } from '@studnicky/types';

import { colorRecordFactory, darken, lighten } from '@studnicky/iridis';
import { muiPlugin } from '@studnicky/iridis-mui';
import { Engine }    from '@studnicky/iridis/engine';
import { Validator } from '@studnicky/iridis/model';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert         from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner }               from '../_runner/ScenarioRunner.ts';
import { MuiPaletteColorEntity }        from '../../src/entities/MuiPaletteColorEntity.ts';
import { DERIVED_SHADE_OFFSETS } from '../../src/tasks/constants/DerivedShadeOffsets.ts';
import { MuiThemeScenarioOutputEntity } from '../entities/MuiThemeScenarioOutputEntity.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class MuiTestFixture {
  static freshEngine(): Engine {
    const engine = new Engine();
    for (const t of coreTasks) {engine.tasks.register(t);}
    engine.adopt(muiPlugin);
    return engine;
  }

  static bareEngine(): Engine {
    const engine = new Engine();
    for (const t of coreTasks) {engine.tasks.register(t);}
    return engine;
  }

  static run(
    engine:   Engine,
    pipeline: readonly string[],
    colors:   InputInterface['colors'],
    roles:    RoleSchemaInterfaceType | undefined,
    metadata: InputInterface['metadata'],
    runtime:  InputInterface['runtime']
  ): PaletteStateInterface {
    engine.pipeline(pipeline);
    return engine.run({
      'bypass':    undefined,
      'colors':    colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  metadata,
      'roles':     roles,
      'runtime':   runtime
    });
  }

  static hexPipeline(extra: readonly string[] = []): readonly string[] {
    return ['intake:hex', 'resolve:roles', ...extra, 'emit:muiTheme'];
  }

  static oklchPipeline(extra: readonly string[] = []): readonly string[] {
    return ['intake:oklch', 'resolve:roles', ...extra, 'emit:muiTheme'];
  }
}

/**
 * Validates `state.outputs['mui:theme']` against the entity mirroring
 * `muiOutputSchema`. `palette`'s value type collapses to an open index
 * signature under `FromSchema` (the production schema declares it
 * `additionalProperties: true` with no fixed keys), so nested family/section
 * access goes through {@link PaletteFamilyAccess} and {@link JsonRecordAccess}
 * rather than a fully-typed production interface.
 */
class MuiScenarioOutput {
  static theme(value: JsonObjectType[string]): MuiThemeScenarioOutputEntity.Type {
    if (!MuiThemeScenarioOutputEntity.validate(value)) {
      throw new Error('outputs.mui:theme is invalid');
    }
    return value;
  }

  /**
   * Reads and validates `state.outputs['mui:theme']` in one call, kept as a
   * module-scope method (not inlined at scenario return sites) so the
   * dynamic-key read never nests inside a `return { ... }` object literal.
   */
  static fromState(state: PaletteStateInterface): MuiThemeScenarioOutputEntity.Type {
    const theme = MuiScenarioOutput.theme(state.outputs['mui:theme']);
    return theme;
  }
}

/** Narrows one `palette[key]` entry against the real `MuiPaletteColorEntity` schema. */
class PaletteFamilyAccess {
  static family(
    palette: MuiThemeScenarioOutputEntity.Type['palette'],
    key:     string
  ): MuiPaletteColorEntity.Type | undefined {
    const value = palette[key];
    if (value === undefined) {return undefined;}
    if (!PaletteFamilyAccess.#isFamily(value)) {
      throw new Error(`palette.${key} does not match the MUI PaletteColor shape`);
    }
    return value;
  }

  static #isFamily(value: JsonObjectType[string]): value is MuiPaletteColorEntity.Type {
    const result = new Validator().validate(MuiPaletteColorEntity.Schema, value);
    return result.valid;
  }
}

/** Narrows a `palette[key]` entry (e.g. `background`, `text`) to a plain, indexable JSON object. */
class JsonRecordAccess {
  static of(value: JsonObjectType[string]): Record<string, JsonObjectType[string]> | undefined {
    if (!JsonRecordAccess.#isRecord(value)) {return undefined;}
    return value;
  }

  static #isRecord(value: JsonObjectType[string]): value is Record<string, JsonObjectType[string]> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}

/** Reads an expected hex value out of a `resolve:roles` result computed by a sibling engine run. */
class ExpectedHex {
  static of(roles: Record<string, ColorRecordInterfaceType>, name: string): string {
    const role = roles[name];
    if (role === undefined) {
      throw new Error(`ExpectedHex: role '${name}' was not resolved by the parallel resolve:roles run`);
    }
    return role.hex;
  }
}

/** Reads an expected hex value out of a `derive:variant` result computed by a sibling engine run. */
class ExpectedVariantHex {
  static of(
    variants:    Record<string, Record<string, ColorRecordInterfaceType>>,
    variantName: string,
    roleName:    string
  ): string {
    const variant = variants[variantName];
    if (variant === undefined) {
      throw new Error(`ExpectedVariantHex: variant '${variantName}' was not produced by the parallel derive:variant run`);
    }
    const role = variant[roleName];
    if (role === undefined) {
      throw new Error(`ExpectedVariantHex: variant '${variantName}' has no role '${roleName}'`);
    }
    return role.hex;
  }
}

/**
 * Asserts that every family named in `keys` is present and falls back to
 * `brandHex`. Kept as a module-scope class method (never inlined into a
 * scenario's `assert` callback, which is itself a value inside an object
 * literal) so the index-based array read never nests inside an
 * `ObjectExpression`.
 */
class FallbackAssertions {
  static assertSemanticFallback(
    palette:  MuiThemeScenarioOutputEntity.Type['palette'],
    keys:     readonly string[],
    brandHex: string
  ): void {
    const length = keys.length;
    for (let index = 0; index < length; index += 1) {
      const key = keys[index];
      if (key === undefined) { continue; }
      const family = PaletteFamilyAccess.family(palette, key);
      assert.ok(family !== undefined, `[cell=5, scenario=semantic-fallback-to-brand] palette.${key} present via brand fallback`);
      assert.strictEqual(family.main, brandHex, `[cell=5, scenario=semantic-fallback-to-brand] palette.${key}.main falls back to brand hex`);
    }
  }
}

/**
 * Runs `resolve:roles` (and optionally `derive:variant`) on a fresh, bare
 * engine so scenario assertions can compare `EmitMuiTheme`'s output against
 * independently-computed ground truth instead of re-implementing role
 * resolution or variant-lightness math inside the test.
 */
class MuiParallelResolve {
  static roles(
    intake: string,
    colors: InputInterface['colors'],
    roles:  RoleSchemaInterfaceType
  ): Record<string, ColorRecordInterfaceType> {
    const engine = MuiTestFixture.bareEngine();
    const state = MuiTestFixture.run(engine, [intake, 'resolve:roles'], colors, roles, undefined, undefined);
    return state.roles;
  }

  static variants(
    colors:   InputInterface['colors'],
    roles:    RoleSchemaInterfaceType,
    metadata: InputInterface['metadata']
  ): Record<string, Record<string, ColorRecordInterfaceType>> {
    const engine = MuiTestFixture.bareEngine();
    const state = MuiTestFixture.run(engine, ['intake:hex', 'resolve:roles', 'derive:variant'], colors, roles, metadata, undefined);
    return state.variants;
  }
}

/** Builds a fully-explicit `RoleDefinitionInterfaceType` with no differentiating hue. */
class PlainRoleFixture {
  static role(name: string, required: boolean): RoleDefinitionInterfaceType {
    return {
      'chromaRange':    undefined,
      'derivedFrom':    undefined,
      'description':    undefined,
      'hue':            undefined,
      'hueClamp':       undefined,
      'hueOffset':      undefined,
      'intent':         undefined,
      'lightnessRange': undefined,
      'name':           name,
      'required':       required
    };
  }

  static schema(schemaName: string, roles: readonly RoleDefinitionInterfaceType[]): RoleSchemaInterfaceType {
    return {
      'contrastPairs': undefined,
      'description':   undefined,
      'name':          schemaName,
      'roles':         [...roles]
    };
  }
}

/**
 * `resolve:roles` picks, per role, the candidate color with the smallest
 * OKLCH distance to that role's declared constraints; a role with no
 * `chromaRange`/`lightnessRange`/`hueOffset` scores every candidate at
 * distance 0, so (since the loop only replaces on a strictly smaller
 * distance) the *first* color in `state.colors` wins every undifferentiated
 * role. To get one distinct, independently-verifiable color per role for
 * the family-assembly assertions below, every role here carries a unique
 * `hueOffset` and is paired with an `intake:oklch` color at that exact hue,
 * so each role's own candidate is the unique zero-distance match.
 */
const ROLE_HUES: Readonly<Record<string, number>> = {
  'accent-alt':  30,
  'background':  180,
  'brand':       0,
  'error':       60,
  'info':        120,
  'on-brand':    300,
  'success':     150,
  'surface':     210,
  'text':        240,
  'text-subtle': 270,
  'warning':     90
};

class OklchRoleFixture {
  static role(name: string): RoleDefinitionInterfaceType {
    const hue = ROLE_HUES[name];
    if (hue === undefined) {throw new Error(`OklchRoleFixture: no hue registered for role '${name}'`);}
    return {
      'chromaRange':    undefined,
      'derivedFrom':    undefined,
      'description':    undefined,
      'hue':            undefined,
      'hueClamp':       undefined,
      'hueOffset':      hue,
      'intent':         undefined,
      'lightnessRange': undefined,
      'name':           name,
      'required':       true
    };
  }

  static schema(schemaName: string, names: readonly string[]): RoleSchemaInterfaceType {
    return {
      'contrastPairs': undefined,
      'description':   undefined,
      'name':          schemaName,
      'roles':         names.map((name) => { const result = OklchRoleFixture.role(name); return result; })
    };
  }

  static colors(names: readonly string[]): InputInterface['colors'] {
    const result = names.map((name) => {
      const hue = ROLE_HUES[name];
      if (hue === undefined) {throw new Error(`OklchRoleFixture: no hue registered for role '${name}'`);}
      const result = { 'c': 0.15, 'h': hue, 'l': 0.5 };
      return result;
    });
    return result;
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FULL_ROLE_NAMES = ['brand', 'accent-alt', 'error', 'warning', 'info', 'success', 'background', 'surface', 'text', 'text-subtle', 'on-brand'] as const;
const FULL_ROLES  = OklchRoleFixture.schema('full', FULL_ROLE_NAMES);
const FULL_COLORS = OklchRoleFixture.colors(FULL_ROLE_NAMES);

const NO_ACCENT_ALT_NAMES = ['brand', 'error', 'warning', 'info', 'success', 'background', 'surface', 'text', 'text-subtle', 'on-brand'] as const;
const NO_ACCENT_ALT_ROLES  = OklchRoleFixture.schema('no-accent-alt', NO_ACCENT_ALT_NAMES);
const NO_ACCENT_ALT_COLORS = OklchRoleFixture.colors(NO_ACCENT_ALT_NAMES);

const NO_SEMANTIC_NAMES = ['brand', 'accent-alt', 'error', 'background', 'surface', 'text', 'text-subtle', 'on-brand'] as const;
const NO_SEMANTIC_ROLES  = OklchRoleFixture.schema('no-semantic', NO_SEMANTIC_NAMES);
const NO_SEMANTIC_COLORS = OklchRoleFixture.colors(NO_SEMANTIC_NAMES);

const NO_BRAND_NAMES = ['accent-alt', 'text'] as const;
const NO_BRAND_ROLES  = OklchRoleFixture.schema('no-brand', NO_BRAND_NAMES);
const NO_BRAND_COLORS = OklchRoleFixture.colors(NO_BRAND_NAMES);

const DEFAULT_VARIANT_ROLES  = PlainRoleFixture.schema('variant-default', [PlainRoleFixture.role('brand', true), PlainRoleFixture.role('error', true)]);
const DEFAULT_VARIANT_COLORS = ['#5b21b6', '#0ea5e9'];

const CUSTOM_VARIANT_ROLES  = PlainRoleFixture.schema('variant-custom', [PlainRoleFixture.role('brand', true)]);
const CUSTOM_VARIANT_COLORS = ['#5b21b6'];

const S300_S700_METADATA: InputInterface['metadata'] = {
  'core:variantConfig': [
    { 'invertLightness': false, 'lightnessOffset': -0.1, 'name': 's300' },
    { 'invertLightness': false, 'lightnessOffset': 0.1,  'name': 's700' }
  ]
};

const MODE_ROLES  = PlainRoleFixture.schema('mode-test', [PlainRoleFixture.role('brand', true)]);
const MODE_COLORS = ['#5b21b6'];

const EMPTY_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description':   undefined,
  'name':          'empty',
  'roles':         []
};

// ---------------------------------------------------------------------------
// Cell 1 — plugin shape
//
// MuiPlugin must satisfy PluginInterface: a singleton with a stable name,
// version, and a tasks() method returning exactly the one emit task.
// Unhappy: structurally impossible here (plugin is a concrete class, no
// invalid input space).
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
      assert.strictEqual(output!.satisfiesPluginShape, true,   '[cell=1, scenario=singleton] satisfies PluginInterface shape');
      assert.strictEqual(output!.name,                 'mui',  '[cell=1, scenario=singleton] name is mui');
      assert.strictEqual(output!.version,              '0.1.0', '[cell=1, scenario=singleton] version is 0.1.0');
    },
    'input': true,
    'kind': 'happy',
    'name': 'singleton satisfies the plugin shape with stable name and version'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-names] no throw');
      assert.deepStrictEqual(output!.taskNames, ['emit:muiTheme'], '[cell=1, scenario=task-names] exactly one emit task returned');
    },
    'input': true,
    'kind': 'happy',
    'name': 'tasks() returns exactly emit:muiTheme'
  }
  // unhappy: structurally impossible — plugin is a sealed singleton; no
  // invalid input exists for tasks() or shape inspection.
];

await new ScenarioRunner<PluginShapeInput, PluginShapeOutput>(
  'MuiPlugin :: cell-1 :: plugin-shape',
  (_input) => {
    return {
      'name':                 muiPlugin.name,
      'satisfiesPluginShape': typeof muiPlugin.tasks === 'function'
        && typeof muiPlugin.schemas === 'function'
        && typeof muiPlugin.name === 'string'
        && typeof muiPlugin.version === 'string',
      'taskNames':            muiPlugin.tasks().map((t) => { const result = t.name; return result; }),
      'version':              muiPlugin.version
    };
  }
).run(pluginShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — full palette build
//
// A role schema covering every role EmitMuiTheme reads must populate every
// palette family/section, each hex value traced back to the same
// resolve:roles output EmitMuiTheme itself read from.
// ---------------------------------------------------------------------------

interface FullPaletteInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType;
}
interface FullPaletteOutputInterface {
  readonly 'expectedRoles': Record<string, ColorRecordInterfaceType>;
  readonly 'theme':         MuiThemeScenarioOutputEntity.Type;
}

const fullPaletteScenarios: readonly ScenarioInterface<FullPaletteInputInterface, FullPaletteOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=full-palette] no throw');
      const { expectedRoles, theme } = output!;
      const palette = theme.palette;

      const primary = PaletteFamilyAccess.family(palette, 'primary');
      assert.ok(primary !== undefined, '[cell=2, scenario=full-palette] primary family present');
      assert.strictEqual(primary.main,  ExpectedHex.of(expectedRoles, 'brand'), '[cell=2, scenario=full-palette] primary.main matches resolved brand hex');
      assert.notStrictEqual(primary.light, primary.main, '[cell=2, scenario=full-palette] primary.light diverges from main (derived, no s300 variant produced by default pipeline)');
      assert.notStrictEqual(primary.dark,  primary.main, '[cell=2, scenario=full-palette] primary.dark diverges from main (derived, no s700 variant produced by default pipeline)');
      assert.strictEqual(primary.contrastText, ExpectedHex.of(expectedRoles, 'on-brand'), '[cell=2, scenario=full-palette] primary.contrastText matches on-brand hex');

      const secondary = PaletteFamilyAccess.family(palette, 'secondary');
      assert.ok(secondary !== undefined, '[cell=2, scenario=full-palette] secondary family present');
      assert.strictEqual(secondary.main, ExpectedHex.of(expectedRoles, 'accent-alt'), '[cell=2, scenario=full-palette] secondary.main matches resolved accent-alt hex (accent-alt present, no brand fallback)');
      assert.strictEqual(secondary.contrastText, ExpectedHex.of(expectedRoles, 'text'), '[cell=2, scenario=full-palette] secondary.contrastText falls back to text hex (no on-accent-alt role)');

      const errorFamily = PaletteFamilyAccess.family(palette, 'error');
      assert.ok(errorFamily !== undefined, '[cell=2, scenario=full-palette] error family present');
      assert.strictEqual(errorFamily.main, ExpectedHex.of(expectedRoles, 'error'), '[cell=2, scenario=full-palette] error.main matches resolved error hex');

      const warning = PaletteFamilyAccess.family(palette, 'warning');
      assert.ok(warning !== undefined, '[cell=2, scenario=full-palette] warning family present');
      assert.strictEqual(warning.main, ExpectedHex.of(expectedRoles, 'warning'), '[cell=2, scenario=full-palette] warning.main matches resolved warning hex (warning present, no brand fallback needed)');

      const info = PaletteFamilyAccess.family(palette, 'info');
      assert.ok(info !== undefined, '[cell=2, scenario=full-palette] info family present');
      assert.strictEqual(info.main, ExpectedHex.of(expectedRoles, 'info'), '[cell=2, scenario=full-palette] info.main matches resolved info hex');

      const success = PaletteFamilyAccess.family(palette, 'success');
      assert.ok(success !== undefined, '[cell=2, scenario=full-palette] success family present');
      assert.strictEqual(success.main, ExpectedHex.of(expectedRoles, 'success'), '[cell=2, scenario=full-palette] success.main matches resolved success hex');

      const background = JsonRecordAccess.of(palette.background);
      assert.ok(background !== undefined, '[cell=2, scenario=full-palette] background section present');
      assert.strictEqual(background.default, ExpectedHex.of(expectedRoles, 'background'), '[cell=2, scenario=full-palette] background.default matches resolved background hex');
      assert.strictEqual(background.paper,   ExpectedHex.of(expectedRoles, 'surface'),    '[cell=2, scenario=full-palette] background.paper matches resolved surface hex');

      const text = JsonRecordAccess.of(palette.text);
      assert.ok(text !== undefined, '[cell=2, scenario=full-palette] text section present');
      assert.strictEqual(text.primary,   ExpectedHex.of(expectedRoles, 'text'),        '[cell=2, scenario=full-palette] text.primary matches resolved text hex');
      assert.strictEqual(text.secondary, ExpectedHex.of(expectedRoles, 'text-subtle'), '[cell=2, scenario=full-palette] text.secondary matches resolved text-subtle hex');

      assert.strictEqual(palette.mode, 'light', '[cell=2, scenario=full-palette] mode defaults to light when runtime is undefined');
    },
    'input': {
      'colors':   FULL_COLORS,
      'pipeline': MuiTestFixture.oklchPipeline(),
      'roles':    FULL_ROLES
    },
    'kind': 'happy',
    'name': 'full role schema populates every palette family and section from resolved role hex values'
  }
];

await new ScenarioRunner<FullPaletteInputInterface, FullPaletteOutputInterface>(
  'MuiPlugin :: cell-2 :: full-palette-build',
  (input) => {
    const engine = MuiTestFixture.freshEngine();
    const state = MuiTestFixture.run(engine, input.pipeline, input.colors, input.roles, undefined, undefined);
    const theme = MuiScenarioOutput.theme(state.outputs['mui:theme']);
    const expectedRoles = MuiParallelResolve.roles('intake:oklch', input.colors, input.roles);
    return { 'expectedRoles': expectedRoles, 'theme': theme };
  }
).run(fullPaletteScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — default-shade-derivation
//
// PaletteFamily.build (EmitMuiTheme.ts) reads variants.s300/variants.s700
// for light/dark, preferring them when present. DEFAULT_VARIANTS
// (DeriveVariant.ts) only ever produces variants named dark/light, so under
// default configuration s300/s700 never exist and both `??` fallbacks fire:
// EmitMuiTheme then derives light/dark itself from the role's own color via
// the core `lighten`/`darken` math primitives (`DERIVED_LIGHT_OFFSET` /
// `DERIVED_DARK_OFFSET`), so shades stay distinct with no variant
// configuration at all — whether derive:variant runs with default config or
// is omitted from the pipeline entirely, since the derivation reads
// `state.roles` directly and never depends on `state.variants` in that path.
// Expected hex is read from the same core `lighten`/`darken` primitives
// EmitMuiTheme calls, not a reimplemented formula, so the assertion is
// ground-truthed against the public API rather than tautological with the
// source. Cell 4 covers the explicit s300/s700 override path taking
// precedence over derivation.
// ---------------------------------------------------------------------------

interface VariantInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'metadata': InputInterface['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType;
}
interface VariantOutputInterface {
  readonly 'expectedRoles': Record<string, ColorRecordInterfaceType>;
  readonly 'theme':         MuiThemeScenarioOutputEntity.Type;
}

/** Computes expected derived shade hex via the same core math primitives EmitMuiTheme calls. */
class ExpectedDerivedShade {
  static light(hex: string): string {
    const result = lighten.apply(colorRecordFactory.fromHex(hex), DERIVED_SHADE_OFFSETS.light).hex;
    return result;
  }

  static dark(hex: string): string {
    const result = darken.apply(colorRecordFactory.fromHex(hex), DERIVED_SHADE_OFFSETS.dark).hex;
    return result;
  }
}

const defaultVariantScenarios: readonly ScenarioInterface<VariantInputInterface, VariantOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=default-config-derives-shades] no throw');
      const { expectedRoles, theme } = output!;
      const palette = theme.palette;
      const primary = PaletteFamilyAccess.family(palette, 'primary');
      const errorFamily = PaletteFamilyAccess.family(palette, 'error');
      assert.ok(primary !== undefined, '[cell=3, scenario=default-config-derives-shades] primary family present');
      assert.ok(errorFamily !== undefined, '[cell=3, scenario=default-config-derives-shades] error family present');

      const brandHex = ExpectedHex.of(expectedRoles, 'brand');
      const errorHex = ExpectedHex.of(expectedRoles, 'error');

      assert.strictEqual(primary.light, ExpectedDerivedShade.light(brandHex), '[cell=3, scenario=default-config-derives-shades] primary.light matches lighten(main, 0.2)');
      assert.strictEqual(primary.dark,  ExpectedDerivedShade.dark(brandHex),  '[cell=3, scenario=default-config-derives-shades] primary.dark matches darken(main, 0.3)');
      assert.strictEqual(errorFamily.light, ExpectedDerivedShade.light(errorHex), '[cell=3, scenario=default-config-derives-shades] error.light matches lighten(main, 0.2)');
      assert.strictEqual(errorFamily.dark,  ExpectedDerivedShade.dark(errorHex),  '[cell=3, scenario=default-config-derives-shades] error.dark matches darken(main, 0.3)');
    },
    'input': {
      'colors':   DEFAULT_VARIANT_COLORS,
      'metadata': undefined,
      'pipeline': MuiTestFixture.hexPipeline(['derive:variant']),
      'roles':    DEFAULT_VARIANT_ROLES
    },
    'kind': 'happy',
    'name': 'default variant config still derives distinct light/dark shades from the role itself'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=no-derive-variant-still-derives] no throw');
      const { expectedRoles, theme } = output!;
      const primary = PaletteFamilyAccess.family(theme.palette, 'primary');
      assert.ok(primary !== undefined, '[cell=3, scenario=no-derive-variant-still-derives] primary family present');
      const brandHex = ExpectedHex.of(expectedRoles, 'brand');
      assert.strictEqual(primary.light, ExpectedDerivedShade.light(brandHex), '[cell=3, scenario=no-derive-variant-still-derives] primary.light still derived when derive:variant is absent entirely');
      assert.strictEqual(primary.dark,  ExpectedDerivedShade.dark(brandHex),  '[cell=3, scenario=no-derive-variant-still-derives] primary.dark still derived when derive:variant is absent entirely');
    },
    'input': {
      'colors':   DEFAULT_VARIANT_COLORS,
      'metadata': undefined,
      'pipeline': MuiTestFixture.hexPipeline(),
      'roles':    DEFAULT_VARIANT_ROLES
    },
    'kind': 'edge',
    'name': 'omitting derive:variant from the pipeline still derives distinct shades'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=shade-ordering] no throw');
      const primary = PaletteFamilyAccess.family(output!.theme.palette, 'primary');
      assert.ok(primary !== undefined, '[cell=3, scenario=shade-ordering] primary family present');

      const lightL = colorRecordFactory.fromHex(primary.light).oklch.l;
      const mainL  = colorRecordFactory.fromHex(primary.main).oklch.l;
      const darkL  = colorRecordFactory.fromHex(primary.dark).oklch.l;

      assert.ok(lightL > mainL, `[cell=3, scenario=shade-ordering] light OKLCH lightness (${lightL}) exceeds main (${mainL})`);
      assert.ok(darkL < mainL,  `[cell=3, scenario=shade-ordering] dark OKLCH lightness (${darkL}) is below main (${mainL})`);
    },
    'input': {
      'colors':   DEFAULT_VARIANT_COLORS,
      'metadata': undefined,
      'pipeline': MuiTestFixture.hexPipeline(),
      'roles':    DEFAULT_VARIANT_ROLES
    },
    'kind': 'happy',
    'name': 'derived shade ordering is measured: light is lighter than main, dark is darker than main'
  }
];

await new ScenarioRunner<VariantInputInterface, VariantOutputInterface>(
  'MuiPlugin :: cell-3 :: default-shade-derivation',
  (input) => {
    const engine = MuiTestFixture.freshEngine();
    const state = MuiTestFixture.run(engine, input.pipeline, input.colors, input.roles, input.metadata, undefined);
    const theme = MuiScenarioOutput.fromState(state);
    const expectedRoles = MuiParallelResolve.roles('intake:hex', input.colors, input.roles);
    return { 'expectedRoles': expectedRoles, 'theme': theme };
  }
).run(defaultVariantScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — custom-variant behavior
//
// Configuring derive:variant with variant names 's300'/'s700' via
// metadata['core:variantConfig'] makes PaletteFamily.build's
// variants.s300/variants.s700 lookups hit, so light/dark diverge from main.
// Expected hex is read from a sibling engine's state.variants, never
// re-derived from the lightness-offset formula, to avoid a tautological
// "just not equal to main" assertion.
// ---------------------------------------------------------------------------

interface CustomVariantOutputInterface {
  readonly 'expectedVariants': Record<string, Record<string, ColorRecordInterfaceType>>;
  readonly 'theme':            MuiThemeScenarioOutputEntity.Type;
}

const customVariantScenarios: readonly ScenarioInterface<VariantInputInterface, CustomVariantOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=s300-s700-config] no throw');
      const { expectedVariants, theme } = output!;
      const primary = PaletteFamilyAccess.family(theme.palette, 'primary');
      assert.ok(primary !== undefined, '[cell=4, scenario=s300-s700-config] primary family present');

      const expectedLight = ExpectedVariantHex.of(expectedVariants, 's300', 'brand');
      const expectedDark  = ExpectedVariantHex.of(expectedVariants, 's700', 'brand');

      assert.notStrictEqual(primary.light, primary.main, '[cell=4, scenario=s300-s700-config] primary.light diverges from main under an s300 variantConfig');
      assert.notStrictEqual(primary.dark,  primary.main, '[cell=4, scenario=s300-s700-config] primary.dark diverges from main under an s700 variantConfig');
      assert.strictEqual(primary.light, expectedLight, '[cell=4, scenario=s300-s700-config] primary.light matches the independently-resolved s300 variant hex');
      assert.strictEqual(primary.dark,  expectedDark,  '[cell=4, scenario=s300-s700-config] primary.dark matches the independently-resolved s700 variant hex');
    },
    'input': {
      'colors':   CUSTOM_VARIANT_COLORS,
      'metadata': S300_S700_METADATA,
      'pipeline': MuiTestFixture.hexPipeline(['derive:variant']),
      'roles':    CUSTOM_VARIANT_ROLES
    },
    'kind': 'happy',
    'name': 'core:variantConfig naming variants s300/s700 makes light/dark diverge from main'
  }
];

await new ScenarioRunner<VariantInputInterface, CustomVariantOutputInterface>(
  'MuiPlugin :: cell-4 :: custom-variant',
  (input) => {
    const engine = MuiTestFixture.freshEngine();
    const state = MuiTestFixture.run(engine, input.pipeline, input.colors, input.roles, input.metadata, undefined);
    const theme = MuiScenarioOutput.theme(state.outputs['mui:theme']);
    const expectedVariants = MuiParallelResolve.variants(input.colors, input.roles, input.metadata);
    return { 'expectedVariants': expectedVariants, 'theme': theme };
  }
).run(customVariantScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — fallback chains
//
// secondary falls back to brand when accent-alt is absent; warning/info/
// success each fall back to brand when their own role is absent.
// ---------------------------------------------------------------------------

interface FallbackInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType;
}
interface FallbackOutputInterface {
  readonly 'expectedRoles': Record<string, ColorRecordInterfaceType>;
  readonly 'theme':         MuiThemeScenarioOutputEntity.Type;
}

const fallbackScenarios: readonly ScenarioInterface<FallbackInputInterface, FallbackOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=secondary-falls-back-to-brand] no throw');
      const { expectedRoles, theme } = output!;
      const secondary = PaletteFamilyAccess.family(theme.palette, 'secondary');
      assert.ok(secondary !== undefined, '[cell=5, scenario=secondary-falls-back-to-brand] secondary family present via brand fallback');
      assert.strictEqual(secondary.main, ExpectedHex.of(expectedRoles, 'brand'), '[cell=5, scenario=secondary-falls-back-to-brand] secondary.main falls back to brand hex when accent-alt is absent');
    },
    'input': {
      'colors':   NO_ACCENT_ALT_COLORS,
      'pipeline': MuiTestFixture.oklchPipeline(),
      'roles':    NO_ACCENT_ALT_ROLES
    },
    'kind': 'happy',
    'name': 'secondary falls back to the brand family when accent-alt is absent'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=semantic-fallback-to-brand] no throw');
      const { expectedRoles, theme } = output!;
      const brandHex = ExpectedHex.of(expectedRoles, 'brand');
      FallbackAssertions.assertSemanticFallback(theme.palette, ['warning', 'info', 'success'], brandHex);
    },
    'input': {
      'colors':   NO_SEMANTIC_COLORS,
      'pipeline': MuiTestFixture.oklchPipeline(),
      'roles':    NO_SEMANTIC_ROLES
    },
    'kind': 'happy',
    'name': 'warning, info, and success all fall back to the brand family when absent'
  }
];

await new ScenarioRunner<FallbackInputInterface, FallbackOutputInterface>(
  'MuiPlugin :: cell-5 :: fallback-chains',
  (input) => {
    const engine = MuiTestFixture.freshEngine();
    const state = MuiTestFixture.run(engine, input.pipeline, input.colors, input.roles, undefined, undefined);
    const theme = MuiScenarioOutput.theme(state.outputs['mui:theme']);
    const expectedRoles = MuiParallelResolve.roles('intake:oklch', input.colors, input.roles);
    return { 'expectedRoles': expectedRoles, 'theme': theme };
  }
).run(fallbackScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — omission
//
// A missing base role omits its family/section outright — PaletteFamily
// never backfills or guesses. When a fallback's own source role is also
// missing, the fallback family is omitted too (not defaulted).
// ---------------------------------------------------------------------------

interface OmissionOutputInterface {
  readonly 'expectedRoles': Record<string, ColorRecordInterfaceType>;
  readonly 'theme':         MuiThemeScenarioOutputEntity.Type;
}

const omissionScenarios: readonly ScenarioInterface<FallbackInputInterface, OmissionOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=missing-brand] no throw');
      const { expectedRoles, theme } = output!;
      const palette = theme.palette;

      assert.strictEqual(palette.primary,    undefined, '[cell=6, scenario=missing-brand] palette.primary is absent, not an empty/defaulted object, when brand is unresolved');
      assert.strictEqual(palette.error,      undefined, '[cell=6, scenario=missing-brand] palette.error is absent (no error role, no fallback for error)');
      assert.strictEqual(palette.warning,    undefined, '[cell=6, scenario=missing-brand] palette.warning is absent because its brand fallback source is also missing');
      assert.strictEqual(palette.info,       undefined, '[cell=6, scenario=missing-brand] palette.info is absent because its brand fallback source is also missing');
      assert.strictEqual(palette.success,    undefined, '[cell=6, scenario=missing-brand] palette.success is absent because its brand fallback source is also missing');
      assert.strictEqual(palette.background, undefined, '[cell=6, scenario=missing-brand] palette.background is absent when no background/surface role resolves');

      const secondary = PaletteFamilyAccess.family(palette, 'secondary');
      assert.ok(secondary !== undefined, '[cell=6, scenario=missing-brand] secondary is still present via its own accent-alt role');
      assert.strictEqual(secondary.main, ExpectedHex.of(expectedRoles, 'accent-alt'), '[cell=6, scenario=missing-brand] secondary.main uses accent-alt directly (no brand needed)');

      const text = JsonRecordAccess.of(palette.text);
      assert.ok(text !== undefined, '[cell=6, scenario=missing-brand] text section present');
      assert.strictEqual(text.primary, ExpectedHex.of(expectedRoles, 'text'), '[cell=6, scenario=missing-brand] text.primary uses the text role hex');
      assert.strictEqual(text.secondary, text.primary, '[cell=6, scenario=missing-brand] text.secondary falls back to text itself when text-subtle and muted are both absent');

      assert.strictEqual(palette.mode, 'light', '[cell=6, scenario=missing-brand] mode is still always present');
    },
    'input': {
      'colors':   NO_BRAND_COLORS,
      'pipeline': MuiTestFixture.oklchPipeline(),
      'roles':    NO_BRAND_ROLES
    },
    'kind': 'edge',
    'name': 'missing brand role omits primary and every family that falls back to it, without defaulting'
  }
];

await new ScenarioRunner<FallbackInputInterface, OmissionOutputInterface>(
  'MuiPlugin :: cell-6 :: omission',
  (input) => {
    const engine = MuiTestFixture.freshEngine();
    const state = MuiTestFixture.run(engine, input.pipeline, input.colors, input.roles, undefined, undefined);
    const theme = MuiScenarioOutput.theme(state.outputs['mui:theme']);
    const expectedRoles = MuiParallelResolve.roles('intake:oklch', input.colors, input.roles);
    return { 'expectedRoles': expectedRoles, 'theme': theme };
  }
).run(omissionScenarios);

// ---------------------------------------------------------------------------
// Cell 7 — mode from runtime.framing
//
// palette.mode is always present: state.runtime.framing ?? 'light'.
// ---------------------------------------------------------------------------

interface ModeInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType;
  readonly 'runtime':  InputInterface['runtime'];
}
interface ModeOutputInterface {
  readonly 'theme': MuiThemeScenarioOutputEntity.Type;
}

const modeScenarios: readonly ScenarioInterface<ModeInputInterface, ModeOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=framing-dark] no throw');
      assert.strictEqual(output!.theme.palette.mode, 'dark', '[cell=7, scenario=framing-dark] mode reflects runtime.framing = dark');
    },
    'input': {
      'colors':   MODE_COLORS,
      'pipeline': MuiTestFixture.hexPipeline(),
      'roles':    MODE_ROLES,
      'runtime':  { 'colorSpace': undefined, 'extra': undefined, 'framing': 'dark' }
    },
    'kind': 'happy',
    'name': 'runtime.framing = dark sets palette.mode to dark'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=no-runtime] no throw');
      assert.strictEqual(output!.theme.palette.mode, 'light', '[cell=7, scenario=no-runtime] mode defaults to light when runtime is undefined');
    },
    'input': {
      'colors':   MODE_COLORS,
      'pipeline': MuiTestFixture.hexPipeline(),
      'roles':    MODE_ROLES,
      'runtime':  undefined
    },
    'kind': 'edge',
    'name': 'undefined runtime defaults palette.mode to light'
  }
];

await new ScenarioRunner<ModeInputInterface, ModeOutputInterface>(
  'MuiPlugin :: cell-7 :: mode-from-framing',
  (input) => {
    const engine = MuiTestFixture.freshEngine();
    const state = MuiTestFixture.run(engine, input.pipeline, input.colors, input.roles, undefined, input.runtime);
    return { 'theme': MuiScenarioOutput.fromState(state) };
  }
).run(modeScenarios);

// ---------------------------------------------------------------------------
// Cell 8 — determinism
//
// Identical input run through two independent, freshly-constructed engines
// must produce byte-identical palette and config output.
// ---------------------------------------------------------------------------

interface DeterminismInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'metadata': InputInterface['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType;
}
interface DeterminismOutputInterface {
  readonly 'first':  MuiThemeScenarioOutputEntity.Type;
  readonly 'second': MuiThemeScenarioOutputEntity.Type;
}

const determinismScenarios: readonly ScenarioInterface<DeterminismInputInterface, DeterminismOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=8, scenario=repeat-run] no throw');
      assert.deepStrictEqual(output!.second.palette, output!.first.palette, '[cell=8, scenario=repeat-run] identical input produces identical palette across independent engines');
      assert.strictEqual(output!.second.config, output!.first.config, '[cell=8, scenario=repeat-run] identical input produces identical config string across independent engines');
    },
    'input': {
      'colors':   FULL_COLORS,
      'metadata': S300_S700_METADATA,
      'pipeline': MuiTestFixture.oklchPipeline(['derive:variant']),
      'roles':    FULL_ROLES
    },
    'kind': 'happy',
    'name': 'identical input run through two fresh engines produces identical palette and config'
  }
];

await new ScenarioRunner<DeterminismInputInterface, DeterminismOutputInterface>(
  'MuiPlugin :: cell-8 :: determinism',
  (input) => {
    const firstEngine = MuiTestFixture.freshEngine();
    const firstState = MuiTestFixture.run(firstEngine, input.pipeline, input.colors, input.roles, input.metadata, undefined);

    const secondEngine = MuiTestFixture.freshEngine();
    const secondState = MuiTestFixture.run(secondEngine, input.pipeline, input.colors, input.roles, input.metadata, undefined);

    return {
      'first':  MuiScenarioOutput.fromState(firstState),
      'second': MuiScenarioOutput.fromState(secondState)
    };
  }
).run(determinismScenarios);

// ---------------------------------------------------------------------------
// Cell 9 — empty roles
//
// A role schema with zero role definitions resolves no roles at all;
// EmitMuiTheme must not throw and must emit a palette containing only mode.
// ---------------------------------------------------------------------------

interface EmptyRolesInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType;
}
interface EmptyRolesOutputInterface {
  readonly 'theme': MuiThemeScenarioOutputEntity.Type;
}

const emptyRolesScenarios: readonly ScenarioInterface<EmptyRolesInputInterface, EmptyRolesOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=no-resolvable-roles] no throw');
      const palette = output!.theme.palette;
      assert.deepStrictEqual(Object.keys(palette), ['mode'], '[cell=9, scenario=no-resolvable-roles] palette contains only the mode key');
      assert.strictEqual(palette.mode, 'light', '[cell=9, scenario=no-resolvable-roles] mode still defaults to light');
    },
    'input': {
      'colors':   [],
      'pipeline': MuiTestFixture.hexPipeline(),
      'roles':    EMPTY_ROLES
    },
    'kind': 'edge',
    'name': 'a role schema with no roles resolves to a palette containing only mode'
  }
];

await new ScenarioRunner<EmptyRolesInputInterface, EmptyRolesOutputInterface>(
  'MuiPlugin :: cell-9 :: empty-roles',
  (input) => {
    const engine = MuiTestFixture.freshEngine();
    const state = MuiTestFixture.run(engine, input.pipeline, input.colors, input.roles, undefined, undefined);
    return { 'theme': MuiScenarioOutput.fromState(state) };
  }
).run(emptyRolesScenarios);

// ---------------------------------------------------------------------------
// Cell 10 — unhappy: missing prerequisite task
//
// engine.pipeline() throws synchronously (ModuleError) when a named task
// isn't registered — here, emit:muiTheme is never registered because
// muiPlugin was never adopted onto the engine.
// ---------------------------------------------------------------------------

type MissingTaskInput = true;
type MissingTaskOutput = true;

const missingTaskScenarios: readonly ScenarioInterface<MissingTaskInput, MissingTaskOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(output, undefined, '[cell=10, scenario=missing-task] pipeline() throws before producing output');
      assert.ok(error !== undefined, '[cell=10, scenario=missing-task] pipeline() throws');
    },
    'input': true,
    'kind': 'unhappy',
    'name': 'pipeline() throws when emit:muiTheme is named but muiPlugin was never adopted'
  }
];

await new ScenarioRunner<MissingTaskInput, MissingTaskOutput>(
  'MuiPlugin :: cell-10 :: unhappy.missing-prerequisite-task',
  (_input) => {
    const engine = MuiTestFixture.bareEngine();
    engine.pipeline(['emit:muiTheme']);
    return true;
  }
).run(missingTaskScenarios);

// ---------------------------------------------------------------------------
// Cell 11 — unhappy: invalid input
//
// engine.run() throws synchronously (ValidationError) when intake:hex
// receives a color entry that isn't a hex string, before emit:muiTheme runs.
// ---------------------------------------------------------------------------

type InvalidInputInput = true;
type InvalidInputOutput = true;

const invalidInputScenarios: readonly ScenarioInterface<InvalidInputInput, InvalidInputOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(output, undefined, '[cell=11, scenario=non-hex-entry] engine.run() throws before emit:muiTheme runs');
      assert.ok(error !== undefined, '[cell=11, scenario=non-hex-entry] engine.run() throws on a non-hex color entry');
    },
    'input': true,
    'kind': 'unhappy',
    'name': 'engine.run() throws when intake:hex receives a non-hex color entry'
  }
];

await new ScenarioRunner<InvalidInputInput, InvalidInputOutput>(
  'MuiPlugin :: cell-11 :: unhappy.invalid-input',
  (_input) => {
    const engine = MuiTestFixture.freshEngine();
    MuiTestFixture.run(engine, MuiTestFixture.hexPipeline(), ['not-a-hex-color'], MODE_ROLES, undefined, undefined);
    return true;
  }
).run(invalidInputScenarios);
