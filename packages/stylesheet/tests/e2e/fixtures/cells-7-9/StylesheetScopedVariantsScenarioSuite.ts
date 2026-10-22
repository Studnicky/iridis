import { type InputEntity, type RoleSchemaEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../../_runner/ScenarioRunner.ts';
import { CssVarsScopedScenarioOutputEntity } from '../../../entities/CssVarsScopedScenarioOutputEntity.ts';
import { StylesheetRoleSchemas } from '../StylesheetRoleSchemas.ts';
import { StylesheetScenarioFixture } from '../StylesheetScenarioFixture.ts';
import { StylesheetCellsSevenToNinePatterns } from './StylesheetCellsSevenToNinePatterns.ts';

interface CssVarsScopedVariantsInputInterface {
  readonly 'colors': InputEntity.Type['colors'];
  readonly 'metadata'?: InputEntity.Type['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles': RoleSchemaEntity.Type;
}

export class StylesheetScopedVariantsScenarioSuite {
  private static readonly defaultPipeline = ['intake:hex', 'resolve:roles', 'emit:cssVarsScoped'];
  private static readonly variantsPipeline = ['intake:hex', 'resolve:roles', 'derive:variant', 'emit:cssVarsScoped'];

  static async run(): Promise<void> {
    await new ScenarioRunner<CssVarsScopedVariantsInputInterface, CssVarsScopedScenarioOutputEntity.Type>(
      'StylesheetPlugin :: cell-7 :: emit:cssVarsScoped.variants',
      StylesheetScopedVariantsScenarioSuite.runScenario
    ).run(StylesheetScopedVariantsScenarioSuite.scenarios);
  }

  private static readonly scenarios: readonly ScenarioInterface<CssVarsScopedVariantsInputInterface, CssVarsScopedScenarioOutputEntity.Type>[] = [
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=7, scenario=dark-variant] no throw');
        const scoped = output?.scoped;
        const darkBlock = scoped?.blocks.dark;
        assert.ok(darkBlock !== undefined, '[cell=7, scenario=dark-variant] blocks has dark key');
        assert.match(darkBlock ?? '', StylesheetCellsSevenToNinePatterns.DARK_SCOPE,
          "[cell=7, scenario=dark-variant] dark block uses [data-theme='dark'] selector");
        const fullIncludesDark = scoped === undefined ? false : scoped.full.includes("[data-theme='dark']");
        assert.ok(fullIncludesDark, '[cell=7, scenario=dark-variant] full includes dark block');
      },
      'input': {
        'colors': ['#5b21b6', '#c4b5fd'],
        'metadata': {},
        'pipeline': StylesheetScopedVariantsScenarioSuite.variantsPipeline,
        'roles': StylesheetRoleSchemas.two
      },
      'kind': 'happy',
      'name': "derive:variant produces dark block under [data-theme='dark'] selector"
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=7, scenario=block-order] no throw');
        const full = output?.scoped.full ?? '';
        const defaultIndex = full.indexOf("[data-theme='default']");
        const darkIndex = full.indexOf("[data-theme='dark']");
        assert.ok(defaultIndex >= 0, '[cell=7, scenario=block-order] default block present in full');
        assert.ok(darkIndex >= 0, '[cell=7, scenario=block-order] dark block present in full');
        assert.ok(defaultIndex < darkIndex,
          '[cell=7, scenario=block-order] default block precedes dark block in full');
      },
      'input': {
        'colors': ['#5b21b6', '#c4b5fd'],
        'metadata': {},
        'pipeline': StylesheetScopedVariantsScenarioSuite.variantsPipeline,
        'roles': StylesheetRoleSchemas.two
      },
      'kind': 'happy',
      'name': 'default block appears before dark block in full'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=7, scenario=no-variants] no throw');
        assert.deepStrictEqual(Object.keys(output?.scoped.blocks ?? {}), ['default'],
          '[cell=7, scenario=no-variants] only default block when no variants');
      },
      'input': {
        'colors': ['#5b21b6'],
        'pipeline': StylesheetScopedVariantsScenarioSuite.defaultPipeline,
        'roles': StylesheetRoleSchemas.single
      },
      'kind': 'edge',
      'name': 'no derive:variant means only default block in blocks'
    }
  ];

  private static runScenario(input: CssVarsScopedVariantsInputInterface): CssVarsScopedScenarioOutputEntity.Type {
    const engine = StylesheetScenarioFixture.engine();
    engine.pipeline(input.pipeline);
    const state = engine.run(StylesheetScenarioFixture.input(input.colors, input.roles, input.metadata));
    const result = CssVarsScopedScenarioOutputEntity.intake({ 'scoped': state.outputs['stylesheet:cssVarsScoped'] });
    return result;
  }
}
