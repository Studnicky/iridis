/**
 * ChakraPlugin e2e — scenario-matrix suite.
 *
 * Subject: `ChakraPlugin` (plugin shape) + `emit:chakraTheme` (Chakra UI
 * `extendTheme()` color-token emission). Each cell covers one concern;
 * scenarios within each cell exhaust the happy / edge / unhappy matrix for
 * that concern.
 *
 * Cells:
 *   1. plugin-shape           — singleton identity, task manifest
 *   2. family+tier coverage   — headline scenario: all 7 families, all 3
 *                               tiers, values traced to independently
 *                               resolved roles/variants (derive:variant IS
 *                               in the pipeline, feeding the 100/900 tiers)
 *   3. variant task omitted   — derive:variant absent from the pipeline;
 *                               every resolving family carries ONLY '500'
 *                               (proves the variant dependency is real)
 *   4. fallback chains        — accent/success/warning/info fall back to
 *                               brand; neutral falls back to text
 *   5. omission                — families with no resolvable role (and no
 *                               resolvable fallback) are absent entirely
 *   6. determinism             — same input via two fresh engines matches
 *   7. empty roles             — no roles resolve; colors is {}, no throw
 *   8. unhappy: missing task   — emit:chakraTheme without adopting the
 *                               plugin throws synchronously from pipeline()
 *   9. unhappy: invalid input  — non-hex color throws before emit runs
 */

import {
  type ColorRecordEntity,
  InputEntity,
  type PaletteStateInterface,
  RoleDefinitionEntity,
  RoleSchemaEntity
} from '@studnicky/iridis';
import { chakraPlugin }  from '@studnicky/iridis-chakra';
import { Engine }        from '@studnicky/iridis/engine';
import { Validator }     from '@studnicky/iridis/model';
import { coreTasks }     from '@studnicky/iridis/tasks';
import { JsonObject }     from '@studnicky/types/node';
import assert            from 'node:assert/strict';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { ChakraThemeScenarioOutputEntity } from '../../entities/ChakraThemeScenarioOutputEntity.ts';
import { PluginShapeScenarioOutputEntity } from '../entities/PluginShapeScenarioOutputEntity.ts';
import { ChakraPluginScenarioConstants } from './ChakraPluginScenarioConstants.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class ChakraTestFixture {
  static freshEngine(): Engine {
    const engine = new Engine();
    const taskCount = coreTasks.length;
    for (let index = 0; index < taskCount; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(chakraPlugin);
    return engine;
  }

  static bareEngine(): Engine {
    const engine = new Engine();
    const taskCount = coreTasks.length;
    for (let index = 0; index < taskCount; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    return engine;
  }

  static input(
    colors: InputEntity.Type['colors'],
    roles: RoleSchemaEntity.Type
  ): InputEntity.Type {
    const input = InputEntity.intake({ 'colors': colors, 'roles': roles });
    return input;
  }

  static run(
    engine: Engine,
    pipeline: readonly string[],
    colors: InputEntity.Type['colors'],
    roles: RoleSchemaEntity.Type
  ): PaletteStateInterface {
    engine.pipeline(pipeline);
    const state = engine.run(ChakraTestFixture.input(colors, roles));
    return state;
  }

  /**
   * Independent ground-truth run: resolves `state.roles` (and, when
   * requested, `state.variants`) via a separate fresh engine and pipeline
   * that never touches `emit:chakraTheme`. Used to compute expected
   * per-tier hex values without re-deriving EmitChakraTheme's own logic.
   */
  static resolvedFixture(
    colors: InputEntity.Type['colors'],
    roles: RoleSchemaEntity.Type,
    pipeline: readonly string[]
  ): PaletteStateInterface {
    const engine = ChakraTestFixture.bareEngine();
    engine.pipeline(pipeline);
    const state = engine.run(ChakraTestFixture.input(colors, roles));
    return state;
  }
}

class ChakraScenarioOutput {
  static theme(theme: JsonObject): ChakraThemeScenarioOutputEntity.Type {
    const output = ChakraThemeScenarioOutputEntity.intake({ 'theme': theme });
    return output;
  }

  /**
   * Reads and validates `state.outputs['chakra:theme']` in one call, kept
   * as a module-scope method (not inlined at scenario return sites) so the
   * dynamic-key read never nests inside a `return { ... }` object literal.
   */
  static fromState(state: PaletteStateInterface): ChakraThemeScenarioOutputEntity.Type['theme'] {
    const theme = state.outputs['chakra:theme'];
    if (theme === undefined) {
      throw new Error('outputs.chakra:theme is missing');
    }
    if (!JsonObject.is(theme)) {
      throw new Error('outputs.chakra:theme is not a JSON object');
    }
    const validated = ChakraScenarioOutput.theme(theme);
    return validated.theme;
  }
}

// Family name -> { role, fallback } as declared by FAMILY_ROLE_MAP.
const FAMILY_ROLE_ENTRIES: readonly { 'fallback'?: string; 'family': string; 'role': string }[] = [
  { 'family': 'brand', 'role': 'brand' },
  { 'fallback': 'brand', 'family': 'accent', 'role': 'accent-alt' },
  { 'fallback': 'brand', 'family': 'success', 'role': 'success' },
  { 'fallback': 'brand', 'family': 'warning', 'role': 'warning' },
  { 'family': 'error', 'role': 'error' },
  { 'fallback': 'brand', 'family': 'info', 'role': 'info' },
  { 'fallback': 'text', 'family': 'neutral', 'role': 'muted' }
];

class RoleDefinition {
  static required(name: string): RoleDefinitionEntity.Type {
    const role = RoleDefinitionEntity.create({ 'name': name, 'required': true });
    return role;
  }
}

/**
 * Dynamic-key readers and per-family assertion helpers. Kept as module-scope
 * class methods (never inlined into a scenario's `assert` callback, which is
 * itself a value inside an object literal) so bracket/computed property
 * access never nests inside an `ObjectExpression`.
 */
class ChakraColorsLookup {
  static assertFamilyEquals(
    colors: Record<string, Record<string, string>>,
    families: readonly string[],
    expected: Record<string, string>,
    messagePrefix: string
  ): void {
    const length = families.length;
    for (let index = 0; index < length; index += 1) {
      const name = families[index];
      if (name === undefined) { continue; }
      assert.deepStrictEqual(colors[name], expected,
        `${messagePrefix} family '${name}' falls back to brand and equals brand's tiers exactly`);
    }
  }

  static assertTierEquals(
    family: Record<string, string>,
    tier: string,
    expected: string,
    message: string
  ): void {
    assert.strictEqual(family[tier], expected, message);
  }
}

class ResolvedRoleLookup {
  static hex(roles: Record<string, ColorRecordEntity.Type>, name: string): string {
    const record = roles[name];
    if (record === undefined) {
      throw new Error(`test fixture: role '${name}' missing from resolved roles`);
    }
    return record.hex;
  }
}

/**
 * Per-entry family/tier assertions for cell 2 (full 100/500/900 coverage)
 * and cell 3 (500-only, derive:variant omitted). Entries come from
 * {@link FAMILY_ROLE_ENTRIES}.
 */
class ChakraTierAssertions {
  static assertFullCoverage(
    colors: Record<string, Record<string, string>>,
    entries: readonly { readonly 'family': string; readonly 'role': string }[],
    expectedRoles: Record<string, ColorRecordEntity.Type>,
    expectedLight: Record<string, ColorRecordEntity.Type>,
    expectedDark: Record<string, ColorRecordEntity.Type>
  ): void {
    const length = entries.length;
    for (let index = 0; index < length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) { continue; }
      const family = entry.family;
      const role = entry.role;
      const familyColors = colors[family];
      assert.ok(familyColors !== undefined, `[cell=2, scenario=all-families] family '${family}' present`);
      assert.deepStrictEqual(
        Object.keys(familyColors).sort((left, right) => {
          const comparison = left.localeCompare(right);
          return comparison;
        }),
        ['100', '500', '900'],
        `[cell=2, scenario=all-families] family '${family}' has exactly tiers 100/500/900`
      );
      assert.strictEqual(familyColors['500'], ResolvedRoleLookup.hex(expectedRoles, role),
        `[cell=2, scenario=all-families] family '${family}' tier 500 matches state.roles['${role}'].hex`);
      assert.strictEqual(familyColors['100'], ResolvedRoleLookup.hex(expectedLight, role),
        `[cell=2, scenario=all-families] family '${family}' tier 100 matches light variant hex for '${role}'`);
      assert.strictEqual(familyColors['900'], ResolvedRoleLookup.hex(expectedDark, role),
        `[cell=2, scenario=all-families] family '${family}' tier 900 matches dark variant hex for '${role}'`);
    }
  }

  static assertTierOnly500(
    colors: Record<string, Record<string, string>>,
    entries: readonly { readonly 'family': string; readonly 'role': string }[],
    expectedRoles: Record<string, ColorRecordEntity.Type>
  ): void {
    const length = entries.length;
    for (let index = 0; index < length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) { continue; }
      const family = entry.family;
      const role = entry.role;
      const familyColors = colors[family];
      assert.ok(familyColors !== undefined, `[cell=3, scenario=variant-task-omitted] family '${family}' present`);
      assert.deepStrictEqual(
        Object.keys(familyColors),
        ['500'],
        `[cell=3, scenario=variant-task-omitted] family '${family}' carries ONLY tier 500`
      );
      assert.strictEqual(familyColors['500'], ResolvedRoleLookup.hex(expectedRoles, role),
        `[cell=3, scenario=variant-task-omitted] family '${family}' tier 500 matches state.roles['${role}'].hex`);
    }
  }
}

export class ChakraPluginScenarioSuite {
  static async run(): Promise<void> {
    // All 7 primary roles the FAMILY_ROLE_MAP reads directly, present so every
    // family resolves via its primary role rather than a fallback.
    const ALL_FAMILY_ROLES = RoleSchemaEntity.create({
      'name': 'all-family-roles',
      'roles': [
        RoleDefinition.required('brand'),
        RoleDefinition.required('accent-alt'),
        RoleDefinition.required('success'),
        RoleDefinition.required('warning'),
        RoleDefinition.required('error'),
        RoleDefinition.required('info'),
        RoleDefinition.required('muted')
      ]
    });
    const ALL_FAMILY_COLORS: InputEntity.Type['colors'] = ['#5b21b6', '#0ea5e9', '#16a34a', '#f59e0b', '#dc2626', '#2563eb', '#6b7280'];

    // ---------------------------------------------------------------------------
    // Cell 1 — plugin shape
    // ---------------------------------------------------------------------------


    const pluginShapeScenarios: readonly ScenarioRunner.ScenarioInterface<true, PluginShapeScenarioOutputEntity.Type>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=singleton] no throw');
          assert.strictEqual(output!.satisfiesPluginShape, true, '[cell=1, scenario=singleton] satisfies PluginInterface shape');
          assert.strictEqual(output!.name,    'chakra', '[cell=1, scenario=singleton] name is chakra');
          assert.strictEqual(output!.version, '0.1.0',  '[cell=1, scenario=singleton] version is 0.1.0');
        },
        'input': true,
        'kind': 'happy',
        'name': 'singleton satisfies the plugin shape with stable name and version'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=task-names] no throw');
          assert.deepStrictEqual(output!.taskNames, ['emit:chakraTheme'],
            '[cell=1, scenario=task-names] exactly one task returned: emit:chakraTheme');
        },
        'input': true,
        'kind': 'happy',
        'name': 'tasks() returns exactly emit:chakraTheme'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=output-schema] no throw');
          assert.strictEqual(output!.validShapeAccepted, true,
            "[cell=1, scenario=output-schema] schemas().outputs['chakra:theme'] accepts a { colors, config } object");
          assert.strictEqual(output!.additionalPropertyRejected, true,
            "[cell=1, scenario=output-schema] schemas().outputs['chakra:theme'] rejects an unknown property (additionalProperties: false)");
        },
        'input': true,
        'kind': 'happy',
        'name': "schemas().outputs['chakra:theme'] declares the expected shape"
      }
      // unhappy: structurally impossible — plugin is a sealed singleton; no
      // invalid input exists for tasks() or shape inspection.
    ];

    await new ScenarioRunner<true, PluginShapeScenarioOutputEntity.Type>(
      'ChakraPlugin :: cell-1 :: plugin-shape',
      (_input) => {
        const outputSchema = chakraPlugin.schemas().outputs?.['chakra:theme'];
        const validator = new Validator();
        const hasOutputSchema = outputSchema !== undefined && JsonObject.is(outputSchema);
        const validShapeAccepted = hasOutputSchema
      && validator.validate(outputSchema, { 'colors': {}, 'config': 'x' }).errors.length === 0;
        const additionalPropertyRejected = hasOutputSchema
      && validator.validate(outputSchema, { 'colors': {}, 'config': 'x', 'extra': 1 }).errors.length > 0;
        const result = PluginShapeScenarioOutputEntity.intake({
          'additionalPropertyRejected': additionalPropertyRejected,
          'name':                       chakraPlugin.name,
          'satisfiesPluginShape':       typeof chakraPlugin.tasks === 'function'
        && typeof chakraPlugin.schemas === 'function'
        && typeof chakraPlugin.name === 'string'
        && typeof chakraPlugin.version === 'string',
          'taskNames':                  chakraPlugin.tasks().map((t) => { const result = t.name; return result; }),
          'validShapeAccepted':         validShapeAccepted,
          'version':                    chakraPlugin.version
        });
        return result;
      }
    ).run(pluginShapeScenarios);

    // ---------------------------------------------------------------------------
    // Cell 2 — full family+tier coverage (headline scenario)
    //
    // All 7 primary roles present -> every family resolves via its primary
    // role. derive:variant IS in the pipeline (chakra's default TIER_SOURCES
    // read the 'light'/'dark' variant names derive:variant produces with no
    // custom config), so every family carries all three tiers. Expected
    // per-tier hex values are traced to an independently resolved fixture run
    // (never to EmitChakraTheme's own output), so this is not tautological.
    // ---------------------------------------------------------------------------

    interface ChakraCoverageOutputInterface {
      readonly 'expectedDark':  Record<string, ColorRecordEntity.Type>;
      readonly 'expectedLight': Record<string, ColorRecordEntity.Type>;
      readonly 'expectedRoles': Record<string, ColorRecordEntity.Type>;
      readonly 'theme':         ChakraThemeScenarioOutputEntity.Type['theme'];
    }

    const chakraCoverageScenarios: readonly ScenarioRunner.ScenarioInterface<true, ChakraCoverageOutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=all-families] no throw');
          const { expectedDark, expectedLight, expectedRoles, theme } = output!;

          assert.strictEqual(Object.keys(theme.colors).length, 7,
            '[cell=2, scenario=all-families] exactly 7 families present in colors');

          ChakraTierAssertions.assertFullCoverage(theme.colors, FAMILY_ROLE_ENTRIES, expectedRoles, expectedLight, expectedDark);
        },
        'input': true,
        'kind': 'happy',
        'name': 'all 7 families resolve with 100/500/900 traced to independently resolved roles and variants'
      }
    ];

    await new ScenarioRunner<true, ChakraCoverageOutputInterface>(
      'ChakraPlugin :: cell-2 :: family-tier-coverage',
      (_input) => {
        const engine = ChakraTestFixture.freshEngine();
        const state = ChakraTestFixture.run(
          engine,
          ['intake:hex', 'resolve:roles', 'derive:variant', 'emit:chakraTheme'],
          ALL_FAMILY_COLORS,
          ALL_FAMILY_ROLES
        );
        const fixture = ChakraTestFixture.resolvedFixture(
          ALL_FAMILY_COLORS,
          ALL_FAMILY_ROLES,
          ['intake:hex', 'resolve:roles', 'derive:variant']
        );
        return {
          'expectedDark':  fixture.variants.dark ?? {},
          'expectedLight': fixture.variants.light ?? {},
          'expectedRoles': fixture.roles,
          'theme':         ChakraScenarioOutput.fromState(state)
        };
      }
    ).run(chakraCoverageScenarios);

    // ---------------------------------------------------------------------------
    // Cell 3 — edge: derive:variant omitted from the pipeline
    //
    // state.variants stays {} (Engine initializes it empty). Every family that
    // resolves via its primary role must still be present in colors, but with
    // ONLY '500' — no '100'/'900'. This proves the variant dependency is real.
    // ---------------------------------------------------------------------------

    interface ChakraNoVariantOutputInterface {
      readonly 'expectedRoles': Record<string, ColorRecordEntity.Type>;
      readonly 'theme':         ChakraThemeScenarioOutputEntity.Type['theme'];
    }

    const chakraNoVariantScenarios: readonly ScenarioRunner.ScenarioInterface<true, ChakraNoVariantOutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=3, scenario=variant-task-omitted] no throw');
          const { expectedRoles, theme } = output!;

          assert.strictEqual(Object.keys(theme.colors).length, 7,
            '[cell=3, scenario=variant-task-omitted] all 7 families still present without derive:variant');

          ChakraTierAssertions.assertTierOnly500(theme.colors, FAMILY_ROLE_ENTRIES, expectedRoles);
        },
        'input': true,
        'kind': 'edge',
        'name': 'without derive:variant, every family carries only tier 500 (no 100/900)'
      }
    ];

    await new ScenarioRunner<true, ChakraNoVariantOutputInterface>(
      'ChakraPlugin :: cell-3 :: variant-task-omitted',
      (_input) => {
        const engine = ChakraTestFixture.freshEngine();
        const state = ChakraTestFixture.run(
          engine,
          ['intake:hex', 'resolve:roles', 'emit:chakraTheme'],
          ALL_FAMILY_COLORS,
          ALL_FAMILY_ROLES
        );
        const fixture = ChakraTestFixture.resolvedFixture(
          ALL_FAMILY_COLORS,
          ALL_FAMILY_ROLES,
          ['intake:hex', 'resolve:roles']
        );
        return {
          'expectedRoles': fixture.roles,
          'theme':         ChakraScenarioOutput.fromState(state)
        };
      }
    ).run(chakraNoVariantScenarios);

    // ---------------------------------------------------------------------------
    // Cell 4 — fallback chains
    //
    // Only 'brand' and 'text' resolve. accent/success/warning/info fall back to
    // 'brand' -> their families equal brand's family exactly. neutral falls
    // back to 'text' via 'muted' -> traced to an independent fixture run.
    // 'error' has no fallback and is absent entirely (covered by its own
    // assertion here rather than deferred to cell 5, since it is a direct
    // consequence of this schema).
    // ---------------------------------------------------------------------------

    const FALLBACK_ROLES = RoleSchemaEntity.create({
      'name': 'fallback-roles',
      'roles': [
        RoleDefinition.required('brand'),
        RoleDefinition.required('text')
      ]
    });
    const FALLBACK_COLORS: InputEntity.Type['colors'] = ['#5b21b6', '#f8fafc'];

    interface ChakraFallbackOutputInterface {
      readonly 'expectedDark':  Record<string, ColorRecordEntity.Type>;
      readonly 'expectedLight': Record<string, ColorRecordEntity.Type>;
      readonly 'expectedRoles': Record<string, ColorRecordEntity.Type>;
      readonly 'theme':         ChakraThemeScenarioOutputEntity.Type['theme'];
    }

    const chakraFallbackScenarios: readonly ScenarioRunner.ScenarioInterface<true, ChakraFallbackOutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=4, scenario=fallback-chains] no throw');
          const { expectedDark, expectedLight, expectedRoles, theme } = output!;

          assert.deepStrictEqual(
            Object.keys(theme.colors).sort((left, right) => {
              const comparison = left.localeCompare(right);
              return comparison;
            }),
            ['accent', 'brand', 'info', 'neutral', 'success', 'warning'],
            '[cell=4, scenario=fallback-chains] error is absent (no fallback, role unresolved); other 6 families present'
          );

          const brandFamily = theme.colors.brand;
          assert.ok(brandFamily !== undefined, "[cell=4, scenario=fallback-chains] family 'brand' present");
          ChakraColorsLookup.assertFamilyEquals(
            theme.colors,
            ['accent', 'success', 'warning', 'info'],
            brandFamily,
            '[cell=4, scenario=fallback-chains]'
          );

          const neutralFamily = theme.colors.neutral;
          assert.ok(neutralFamily !== undefined, "[cell=4, scenario=fallback-chains] family 'neutral' present");
          ChakraColorsLookup.assertTierEquals(neutralFamily, '500', ResolvedRoleLookup.hex(expectedRoles, 'text'),
            "[cell=4, scenario=fallback-chains] neutral tier 500 matches state.roles['text'].hex (fallback)");
          ChakraColorsLookup.assertTierEquals(neutralFamily, '100', ResolvedRoleLookup.hex(expectedLight, 'text'),
            "[cell=4, scenario=fallback-chains] neutral tier 100 matches light variant hex for 'text'");
          ChakraColorsLookup.assertTierEquals(neutralFamily, '900', ResolvedRoleLookup.hex(expectedDark, 'text'),
            "[cell=4, scenario=fallback-chains] neutral tier 900 matches dark variant hex for 'text'");
        },
        'input': true,
        'kind': 'happy',
        'name': 'accent/success/warning/info fall back to brand; neutral falls back to text'
      }
    ];

    await new ScenarioRunner<true, ChakraFallbackOutputInterface>(
      'ChakraPlugin :: cell-4 :: fallback-chains',
      (_input) => {
        const engine = ChakraTestFixture.freshEngine();
        const state = ChakraTestFixture.run(
          engine,
          ['intake:hex', 'resolve:roles', 'derive:variant', 'emit:chakraTheme'],
          FALLBACK_COLORS,
          FALLBACK_ROLES
        );
        const fixture = ChakraTestFixture.resolvedFixture(
          FALLBACK_COLORS,
          FALLBACK_ROLES,
          ['intake:hex', 'resolve:roles', 'derive:variant']
        );
        return {
          'expectedDark':  fixture.variants.dark ?? {},
          'expectedLight': fixture.variants.light ?? {},
          'expectedRoles': fixture.roles,
          'theme':         ChakraScenarioOutput.fromState(state)
        };
      }
    ).run(chakraFallbackScenarios);

    // ---------------------------------------------------------------------------
    // Cell 5 — omission
    //
    // brand and error are both absent, AND none of the roles that would
    // fall back to brand (accent-alt/success/warning/info) are present either.
    // Only 'muted' and 'text' resolve. brand/error/accent/success/warning/info
    // must ALL be absent from colors; only neutral (muted, direct) remains.
    // ---------------------------------------------------------------------------

    const OMISSION_ROLES = RoleSchemaEntity.create({
      'name': 'omission-roles',
      'roles': [
        RoleDefinition.required('muted'),
        RoleDefinition.required('text')
      ]
    });
    const OMISSION_COLORS: InputEntity.Type['colors'] = ['#6b7280', '#f8fafc'];

    interface ChakraOmissionOutputInterface {
      readonly 'theme': ChakraThemeScenarioOutputEntity.Type['theme'];
    }

    const chakraOmissionScenarios: readonly ScenarioRunner.ScenarioInterface<true, ChakraOmissionOutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=5, scenario=no-brand-no-error] no throw');
          const { theme } = output!;
          assert.deepStrictEqual(Object.keys(theme.colors), ['neutral'],
            '[cell=5, scenario=no-brand-no-error] only neutral resolves; brand/error/accent/success/warning/info all absent');
          const neutralFamily = theme.colors.neutral;
          assert.ok(neutralFamily !== undefined, "[cell=5, scenario=no-brand-no-error] family 'neutral' present");
          assert.deepStrictEqual(Object.keys(neutralFamily).sort((left, right) => {
            const comparison = left.localeCompare(right);
            return comparison;
          }), ['100', '500', '900'],
          '[cell=5, scenario=no-brand-no-error] the one surviving family still carries all 3 tiers');
        },
        'input': true,
        'kind': 'edge',
        'name': 'families with no resolvable role and no resolvable fallback are absent entirely'
      }
    ];

    await new ScenarioRunner<true, ChakraOmissionOutputInterface>(
      'ChakraPlugin :: cell-5 :: omission',
      (_input) => {
        const engine = ChakraTestFixture.freshEngine();
        const state = ChakraTestFixture.run(
          engine,
          ['intake:hex', 'resolve:roles', 'derive:variant', 'emit:chakraTheme'],
          OMISSION_COLORS,
          OMISSION_ROLES
        );
        return { 'theme': ChakraScenarioOutput.fromState(state) };
      }
    ).run(chakraOmissionScenarios);

    // ---------------------------------------------------------------------------
    // Cell 6 — determinism
    //
    // Same input run through two independent fresh engines must produce
    // byte-identical colors and config.
    // ---------------------------------------------------------------------------

    interface ChakraDeterminismOutputInterface {
      readonly 'first':  ChakraThemeScenarioOutputEntity.Type['theme'];
      readonly 'second': ChakraThemeScenarioOutputEntity.Type['theme'];
    }

    const chakraDeterminismScenarios: readonly ScenarioRunner.ScenarioInterface<true, ChakraDeterminismOutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=6, scenario=two-engines] no throw');
          assert.deepStrictEqual(output!.first.colors, output!.second.colors,
            '[cell=6, scenario=two-engines] colors identical across two fresh engine runs');
          assert.strictEqual(output!.first.config, output!.second.config,
            '[cell=6, scenario=two-engines] config identical across two fresh engine runs');
        },
        'input': true,
        'kind': 'happy',
        'name': 'same input via two fresh engines produces identical colors and config'
      }
    ];

    await new ScenarioRunner<true, ChakraDeterminismOutputInterface>(
      'ChakraPlugin :: cell-6 :: determinism',
      (_input) => {
        const pipeline = ['intake:hex', 'resolve:roles', 'derive:variant', 'emit:chakraTheme'];
        const firstState = ChakraTestFixture.run(ChakraTestFixture.freshEngine(), pipeline, ALL_FAMILY_COLORS, ALL_FAMILY_ROLES);
        const secondState = ChakraTestFixture.run(ChakraTestFixture.freshEngine(), pipeline, ALL_FAMILY_COLORS, ALL_FAMILY_ROLES);
        return {
          'first':  ChakraScenarioOutput.fromState(firstState),
          'second': ChakraScenarioOutput.fromState(secondState)
        };
      }
    ).run(chakraDeterminismScenarios);

    // ---------------------------------------------------------------------------
    // Cell 7 — edge: empty roles
    //
    // No role schema entries at all -> nothing resolves in state.roles ->
    // every family is skipped -> colors is {} and config is still a
    // well-formed, non-throwing string.
    // ---------------------------------------------------------------------------

    const EMPTY_ROLES = RoleSchemaEntity.create({
      'name': 'empty',
      'roles': []
    });

    interface ChakraEmptyRolesOutputInterface {
      readonly 'theme': ChakraThemeScenarioOutputEntity.Type['theme'];
    }

    const chakraEmptyRolesScenarios: readonly ScenarioRunner.ScenarioInterface<true, ChakraEmptyRolesOutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=7, scenario=empty-roles] no throw');
          assert.deepStrictEqual(output!.theme.colors, {},
            '[cell=7, scenario=empty-roles] colors is {} when no roles resolve');
          assert.ok(output!.theme.config.includes('extendTheme('),
            '[cell=7, scenario=empty-roles] config is still a well-formed extendTheme() string');
          assert.ok(output!.theme.config.length > 0,
            '[cell=7, scenario=empty-roles] config is a non-empty string');
        },
        'input': true,
        'kind': 'edge',
        'name': 'empty role schema produces colors: {} without throwing'
      }
    ];

    await new ScenarioRunner<true, ChakraEmptyRolesOutputInterface>(
      'ChakraPlugin :: cell-7 :: empty-roles',
      (_input) => {
        const engine = ChakraTestFixture.freshEngine();
        const state = ChakraTestFixture.run(
          engine,
          ['intake:hex', 'resolve:roles', 'derive:variant', 'emit:chakraTheme'],
          ['#5b21b6'],
          EMPTY_ROLES
        );
        return { 'theme': ChakraScenarioOutput.fromState(state) };
      }
    ).run(chakraEmptyRolesScenarios);

    // ---------------------------------------------------------------------------
    // Cell 8 — unhappy: missing prerequisite task
    //
    // engine.pipeline(['emit:chakraTheme']) without adopting chakraPlugin must
    // throw synchronously, since the task name was never registered.
    // ---------------------------------------------------------------------------


    const chakraMissingTaskScenarios: readonly ScenarioRunner.ScenarioInterface<true, true>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(output, undefined, '[cell=8, scenario=unregistered-task] no output on throw');
          assert.ok(error !== undefined, '[cell=8, scenario=unregistered-task] engine.pipeline throws');
          assert.match(error.message, ChakraPluginScenarioConstants.unregisteredTaskPattern,
            '[cell=8, scenario=unregistered-task] error names the unregistered task');
        },
        'input': true,
        'kind': 'unhappy',
        'name': "engine.pipeline throws when 'emit:chakraTheme' is named without adopting chakraPlugin"
      }
    ];

    await new ScenarioRunner<true, true>(
      'ChakraPlugin :: cell-8 :: missing-prerequisite-task',
      (_input) => {
        const engine = ChakraTestFixture.bareEngine();
        engine.pipeline(['emit:chakraTheme']);
        return true;
      }
    ).run(chakraMissingTaskScenarios);

    // ---------------------------------------------------------------------------
    // Cell 9 — unhappy: invalid input
    //
    // intake:hex throws synchronously on a non-hex color entry, before
    // emit:chakraTheme ever runs.
    // ---------------------------------------------------------------------------


    const chakraInvalidInputScenarios: readonly ScenarioRunner.ScenarioInterface<true, true>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(output, undefined, '[cell=9, scenario=non-hex-color] no output on throw');
          assert.ok(error !== undefined, '[cell=9, scenario=non-hex-color] engine.run throws on non-hex input');
        },
        'input': true,
        'kind': 'unhappy',
        'name': 'engine.run throws on non-hex color input before emit:chakraTheme runs'
      }
    ];

    await new ScenarioRunner<true, true>(
      'ChakraPlugin :: cell-9 :: invalid-input',
      (_input) => {
        const engine = ChakraTestFixture.freshEngine();
        ChakraTestFixture.run(
          engine,
          ['intake:hex', 'resolve:roles', 'derive:variant', 'emit:chakraTheme'],
          ['not-a-hex-color'],
          ALL_FAMILY_ROLES
        );
        return true;
      }
    ).run(chakraInvalidInputScenarios);
  }
}
