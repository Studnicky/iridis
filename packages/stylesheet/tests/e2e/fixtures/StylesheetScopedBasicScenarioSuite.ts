import { type InputInterfaceTypeEntity, type RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { CssVarsScopedScenarioOutputEntity } from '../../entities/CssVarsScopedScenarioOutputEntity.ts';
import { StylesheetRoleSchemas } from './StylesheetRoleSchemas.ts';
import { StylesheetScenarioFixture } from './StylesheetScenarioFixture.ts';
import { StylesheetScenarioPatterns } from './StylesheetScenarioPatterns.ts';
import { StylesheetScopedBasicScenarioPatterns } from './StylesheetScopedBasicScenarioPatterns.ts';

interface CssVarsScopedBasicInputInterface {
  readonly 'colors': InputInterfaceTypeEntity.Type['colors'];
  readonly 'metadata'?: InputInterfaceTypeEntity.Type['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles': RoleSchemaInterfaceTypeEntity.Type;
}

export class StylesheetScopedBasicScenarioSuite {
  private static readonly scopedPipeline = ['intake:hex', 'resolve:roles', 'emit:cssVarsScoped'];

  static async run(): Promise<void> {
    await new ScenarioRunner<CssVarsScopedBasicInputInterface, CssVarsScopedScenarioOutputEntity.Type>(
      'StylesheetPlugin :: cell-6 :: emit:cssVarsScoped.basic',
      StylesheetScopedBasicScenarioSuite.runScenario
    ).run(StylesheetScopedBasicScenarioSuite.scenarios);
  }

  private static readonly scenarios: readonly ScenarioInterface<CssVarsScopedBasicInputInterface, CssVarsScopedScenarioOutputEntity.Type>[] = [
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=6, scenario=single-role-scoped] no throw');
        const scoped = output?.scoped;
        const defaultBlock = scoped?.blocks.default;
        assert.ok(defaultBlock !== undefined, '[cell=6, scenario=single-role-scoped] blocks has default key');
        assert.match(defaultBlock ?? '', StylesheetScopedBasicScenarioPatterns.DEFAULT_SCOPE,
          "[cell=6, scenario=single-role-scoped] default block uses [data-theme='default'] selector");
        assert.match(defaultBlock ?? '', StylesheetScenarioPatterns.CSS_VARIABLE_PATTERN,
          '[cell=6, scenario=single-role-scoped] primary var declared in default block');
        assert.deepStrictEqual(scoped?.wideGamut, {},
          '[cell=6, scenario=single-role-scoped] wideGamut empty for sRGB-only input');
        assert.ok(scoped?.full.includes("[data-theme='default']"),
          '[cell=6, scenario=single-role-scoped] full includes default block');
      },
      'input': {
        'colors': ['#5b21b6'],
        'metadata': {},
        'pipeline': StylesheetScopedBasicScenarioSuite.scopedPipeline,
        'roles': StylesheetRoleSchemas.single
      },
      'kind': 'happy',
      'name': 'single-role sRGB palette writes default block with [data-theme] selector'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=6, scenario=two-roles-scoped] no throw');
        const defaultBlock = output?.scoped.blocks.default ?? '';
        assert.match(defaultBlock, StylesheetScopedBasicScenarioPatterns.PRIMARY_VARIABLE,
          '[cell=6, scenario=two-roles-scoped] primary var in default block');
        assert.match(defaultBlock, StylesheetScopedBasicScenarioPatterns.SECONDARY_VARIABLE,
          '[cell=6, scenario=two-roles-scoped] secondary var in default block');
      },
      'input': {
        'colors': ['#5b21b6', '#c4b5fd'],
        'metadata': {},
        'pipeline': StylesheetScopedBasicScenarioSuite.scopedPipeline,
        'roles': StylesheetRoleSchemas.two
      },
      'kind': 'happy',
      'name': 'two-role sRGB palette declares both vars in default block'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=6, scenario=output-shape-scoped] no throw');
        const scoped = output?.scoped;
        assert.ok(typeof scoped?.blocks === 'object', '[cell=6, scenario=output-shape-scoped] blocks is object');
        assert.ok(typeof scoped?.wideGamut === 'object', '[cell=6, scenario=output-shape-scoped] wideGamut is object');
        assert.ok(typeof scoped?.full === 'string', '[cell=6, scenario=output-shape-scoped] full is string');
      },
      'input': {
        'colors': ['#000000'],
        'pipeline': StylesheetScopedBasicScenarioSuite.scopedPipeline,
        'roles': StylesheetRoleSchemas.single
      },
      'kind': 'edge',
      'name': 'output shape has blocks, wideGamut, and full fields'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=6, scenario=no-supports-srgb] no throw');
        const full = output?.scoped.full ?? '';
        assert.ok(!full.includes('@supports'),
          '[cell=6, scenario=no-supports-srgb] full contains no @supports for sRGB-only');
        assert.ok(!full.includes('display-p3'),
          '[cell=6, scenario=no-supports-srgb] full contains no display-p3 for sRGB-only');
      },
      'input': {
        'colors': ['#5b21b6', '#c4b5fd'],
        'pipeline': StylesheetScopedBasicScenarioSuite.scopedPipeline,
        'roles': StylesheetRoleSchemas.two
      },
      'kind': 'edge',
      'name': 'sRGB-only input produces no @supports and no display-p3 in full'
    }
  ];

  private static runScenario(input: CssVarsScopedBasicInputInterface): CssVarsScopedScenarioOutputEntity.Type {
    const engine = StylesheetScenarioFixture.engine();
    engine.pipeline(input.pipeline);
    const state = engine.run(StylesheetScenarioFixture.input(input.colors, input.roles, input.metadata));
    const result = CssVarsScopedScenarioOutputEntity.intake({ 'scoped': state.outputs['stylesheet:cssVarsScoped'] });
    return result;
  }
}
