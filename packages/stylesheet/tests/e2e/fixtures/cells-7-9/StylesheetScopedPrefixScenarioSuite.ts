import { type InputInterfaceTypeEntity, type RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../../_runner/ScenarioRunner.ts';
import { CssVarsScopedScenarioOutputEntity } from '../../../entities/CssVarsScopedScenarioOutputEntity.ts';
import { StylesheetRoleSchemas } from '../StylesheetRoleSchemas.ts';
import { StylesheetScenarioFixture } from '../StylesheetScenarioFixture.ts';
import { StylesheetCellsSevenToNinePatterns } from './StylesheetCellsSevenToNinePatterns.ts';
import { StylesheetCellsSevenToNineRoleSchemas } from './StylesheetCellsSevenToNineRoleSchemas.ts';

interface CssVarsScopedPrefixInputInterface {
  readonly 'colors': InputInterfaceTypeEntity.Type['colors'];
  readonly 'metadata': InputInterfaceTypeEntity.Type['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles': RoleSchemaInterfaceTypeEntity.Type;
}

export class StylesheetScopedPrefixScenarioSuite {
  private static readonly oklchPipeline = ['intake:oklch', 'resolve:roles', 'emit:cssVarsScoped'];
  private static readonly scopedPipeline = ['intake:hex', 'resolve:roles', 'emit:cssVarsScoped'];
  private static readonly variantsPipeline = ['intake:hex', 'resolve:roles', 'derive:variant', 'emit:cssVarsScoped'];

  static async run(): Promise<void> {
    await new ScenarioRunner<CssVarsScopedPrefixInputInterface, CssVarsScopedScenarioOutputEntity.Type>(
      'StylesheetPlugin :: cell-9 :: emit:cssVarsScoped.scope-prefix',
      StylesheetScopedPrefixScenarioSuite.runScenario
    ).run(StylesheetScopedPrefixScenarioSuite.scenarios);
  }

  private static readonly scenarios: readonly ScenarioInterface<CssVarsScopedPrefixInputInterface, CssVarsScopedScenarioOutputEntity.Type>[] = [
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=9, scenario=default-scope-prefix] no throw');
        const defaultBlock = output?.scoped.blocks.default ?? '';
        assert.match(defaultBlock, StylesheetCellsSevenToNinePatterns.DEFAULT_SCOPE,
          "[cell=9, scenario=default-scope-prefix] default scopePrefix is 'theme'");
      },
      'input': {
        'colors': ['#5b21b6'],
        'metadata': {},
        'pipeline': StylesheetScopedPrefixScenarioSuite.scopedPipeline,
        'roles': StylesheetRoleSchemas.single
      },
      'kind': 'happy',
      'name': 'default scopePrefix is theme when metadata absent'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=9, scenario=custom-scope-prefix] no throw');
        const scoped = output?.scoped;
        const defaultBlock = scoped?.blocks.default ?? '';
        assert.match(defaultBlock, StylesheetCellsSevenToNinePatterns.CUSTOM_PREFIX_DEFAULT_SCOPE,
          '[cell=9, scenario=custom-scope-prefix] custom scopePrefix used in blocks selector');
        const containsThemePrefix = scoped === undefined ? false : scoped.full.includes('[data-theme=');
        assert.ok(!containsThemePrefix,
          '[cell=9, scenario=custom-scope-prefix] default theme prefix absent from full');
      },
      'input': {
        'colors': ['#5b21b6', '#c4b5fd'],
        'metadata': { 'scopePrefix': 'app-palette' },
        'pipeline': StylesheetScopedPrefixScenarioSuite.scopedPipeline,
        'roles': StylesheetRoleSchemas.two
      },
      'kind': 'happy',
      'name': 'custom scopePrefix replaces theme in selectors'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=9, scenario=prefix-variants] no throw');
        const darkBlock = output?.scoped.blocks.dark ?? '';
        assert.match(darkBlock, StylesheetCellsSevenToNinePatterns.CUSTOM_PREFIX_DARK_SCOPE,
          '[cell=9, scenario=prefix-variants] dark variant block uses custom scopePrefix');
      },
      'input': {
        'colors': ['#5b21b6', '#c4b5fd'],
        'metadata': { 'scopePrefix': 'myapp' },
        'pipeline': StylesheetScopedPrefixScenarioSuite.variantsPipeline,
        'roles': StylesheetRoleSchemas.two
      },
      'kind': 'happy',
      'name': 'custom scopePrefix propagates into variant blocks'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=9, scenario=prefix-p3] no throw');
        const scoped = output?.scoped;
        const defaultP3 = scoped?.wideGamut.default ?? '';
        assert.ok(scoped !== undefined && 'default' in scoped.wideGamut,
          '[cell=9, scenario=prefix-p3] wideGamut has default entry');
        assert.match(defaultP3, StylesheetCellsSevenToNinePatterns.CUSTOM_PREFIX_P3_SCOPE,
          "[cell=9, scenario=prefix-p3] P3 @supports block scoped under [data-custom-scope='default']");
      },
      'input': {
        'colors': [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
        'metadata': { 'scopePrefix': 'custom-scope' },
        'pipeline': StylesheetScopedPrefixScenarioSuite.oklchPipeline,
        'roles': StylesheetCellsSevenToNineRoleSchemas.wideGamut
      },
      'kind': 'edge',
      'name': 'scopePrefix with P3 input propagates into wideGamut @supports block'
    }
  ];

  private static runScenario(input: CssVarsScopedPrefixInputInterface): CssVarsScopedScenarioOutputEntity.Type {
    const engine = StylesheetScenarioFixture.engine();
    engine.pipeline(input.pipeline);
    const state = engine.run(StylesheetScenarioFixture.input(input.colors, input.roles, input.metadata));
    const result = CssVarsScopedScenarioOutputEntity.intake({ 'scoped': state.outputs['stylesheet:cssVarsScoped'] });
    return result;
  }
}
