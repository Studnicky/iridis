import { type InputInterfaceTypeEntity, type RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../../_runner/ScenarioRunner.ts';
import { CssVarsScopedScenarioOutputEntity } from '../../../entities/CssVarsScopedScenarioOutputEntity.ts';
import { StylesheetRoleSchemas } from '../StylesheetRoleSchemas.ts';
import { StylesheetScenarioFixture } from '../StylesheetScenarioFixture.ts';
import { StylesheetScenarioPatterns } from '../StylesheetScenarioPatterns.ts';
import { StylesheetCellsSevenToNinePatterns } from './StylesheetCellsSevenToNinePatterns.ts';
import { StylesheetCellsSevenToNineRoleSchemas } from './StylesheetCellsSevenToNineRoleSchemas.ts';

interface CssVarsScopedWideGamutInputInterface {
  readonly 'colors': InputInterfaceTypeEntity.Type['colors'];
  readonly 'metadata'?: InputInterfaceTypeEntity.Type['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles': RoleSchemaInterfaceTypeEntity.Type;
}

export class StylesheetScopedWideGamutScenarioSuite {
  private static readonly oklchPipeline = ['intake:oklch', 'resolve:roles', 'emit:cssVarsScoped'];
  private static readonly srgbPipeline = ['intake:hex', 'resolve:roles', 'emit:cssVarsScoped'];

  static async run(): Promise<void> {
    await new ScenarioRunner<CssVarsScopedWideGamutInputInterface, CssVarsScopedScenarioOutputEntity.Type>(
      'StylesheetPlugin :: cell-8 :: emit:cssVarsScoped.wide-gamut',
      StylesheetScopedWideGamutScenarioSuite.runScenario
    ).run(StylesheetScopedWideGamutScenarioSuite.scenarios);
  }

  private static readonly scenarios: readonly ScenarioInterface<CssVarsScopedWideGamutInputInterface, CssVarsScopedScenarioOutputEntity.Type>[] = [
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=8, scenario=oklch-scoped-p3] no throw');
        const scoped = output?.scoped;
        const defaultP3 = scoped?.wideGamut.default ?? '';
        assert.ok(scoped !== undefined && 'default' in scoped.wideGamut,
          '[cell=8, scenario=oklch-scoped-p3] wideGamut has default entry');
        assert.match(defaultP3, StylesheetScenarioPatterns.P3_SUPPORTS_PATTERN,
          '[cell=8, scenario=oklch-scoped-p3] wideGamut block opens with @supports query');
        assert.match(defaultP3, StylesheetCellsSevenToNinePatterns.P3_DEFAULT_SCOPE,
          "[cell=8, scenario=oklch-scoped-p3] P3 block scoped under [data-iridis='default']");
        assert.match(defaultP3, StylesheetCellsSevenToNinePatterns.P3_VARIABLE,
          '[cell=8, scenario=oklch-scoped-p3] P3 value declared under the scoped selector');
      },
      'input': {
        'colors': [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
        'metadata': { 'scopePrefix': 'iridis' },
        'pipeline': StylesheetScopedWideGamutScenarioSuite.oklchPipeline,
        'roles': StylesheetCellsSevenToNineRoleSchemas.wideGamut
      },
      'kind': 'happy',
      'name': 'out-of-sRGB OKLCH emits @supports sibling for default category'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=8, scenario=scoped-cascade-order] no throw');
        const full = output?.scoped.full ?? '';
        const srgbIndex = full.indexOf("[data-iridis='default'] {");
        const supportsIndex = full.indexOf('@supports (color: color(display-p3 0 0 0))');
        assert.ok(srgbIndex >= 0, '[cell=8, scenario=scoped-cascade-order] sRGB scoped block present');
        assert.ok(supportsIndex >= 0, '[cell=8, scenario=scoped-cascade-order] @supports block present');
        assert.ok(srgbIndex < supportsIndex,
          '[cell=8, scenario=scoped-cascade-order] sRGB scoped block precedes @supports sibling');
      },
      'input': {
        'colors': [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
        'metadata': { 'scopePrefix': 'iridis' },
        'pipeline': StylesheetScopedWideGamutScenarioSuite.oklchPipeline,
        'roles': StylesheetCellsSevenToNineRoleSchemas.wideGamut
      },
      'kind': 'happy',
      'name': 'sRGB scoped block precedes its @supports sibling in full'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=8, scenario=srgb-no-supports-scoped] no throw');
        const scoped = output?.scoped;
        assert.deepStrictEqual(scoped?.wideGamut, {},
          '[cell=8, scenario=srgb-no-supports-scoped] wideGamut is empty object for sRGB-only');
        const fullContainsSupports = (output?.scoped.full ?? '').includes('@supports');
        assert.ok(!fullContainsSupports,
          '[cell=8, scenario=srgb-no-supports-scoped] full has no @supports for sRGB-only');
      },
      'input': {
        'colors': ['#5b21b6'],
        'pipeline': StylesheetScopedWideGamutScenarioSuite.srgbPipeline,
        'roles': StylesheetRoleSchemas.single
      },
      'kind': 'edge',
      'name': 'sRGB-only input has empty wideGamut map and no @supports in full'
    }
  ];

  private static runScenario(input: CssVarsScopedWideGamutInputInterface): CssVarsScopedScenarioOutputEntity.Type {
    const engine = StylesheetScenarioFixture.engine();
    engine.pipeline(input.pipeline);
    const state = engine.run(StylesheetScenarioFixture.input(input.colors, input.roles, input.metadata));
    const result = CssVarsScopedScenarioOutputEntity.intake({ 'scoped': state.outputs['stylesheet:cssVarsScoped'] });
    return result;
  }
}
