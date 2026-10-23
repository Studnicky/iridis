import { type InputEntity, RoleSchemaEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../../_runner/ScenarioRunner.ts';
import { CssVarsScenarioOutputEntity } from '../../../entities/CssVarsScenarioOutputEntity.ts';
import { StylesheetCellsOneToThree } from '../StylesheetCellsOneToThree.ts';
import { StylesheetScenarioFixture } from '../StylesheetScenarioFixture.ts';
import { StylesheetCellsOneToThreeScenarioPatterns } from './StylesheetCellsOneToThreeScenarioPatterns.ts';

interface CssVarsBasicInputInterface {
  readonly 'colors': InputEntity.Type['colors'];
  readonly 'pipeline': readonly string[];
  readonly 'roles': RoleSchemaEntity.Type;
}

const allIntentRoles = RoleSchemaEntity.intake({
  'name': 'all-intent',
  'roles': [
    { 'intent': 'background', 'name': 'bg', 'required': true },
    { 'intent': 'text', 'name': 'fg', 'required': true },
    { 'intent': 'accent', 'name': 'acc', 'required': true },
    { 'intent': 'muted', 'name': 'muted' },
    { 'intent': 'critical', 'name': 'critical' },
    { 'intent': 'positive', 'name': 'positive' },
    { 'intent': 'link', 'name': 'lnk' },
    { 'intent': 'button', 'name': 'btn' },
    { 'intent': 'onAccent', 'name': 'onAcc' },
    { 'intent': 'onButton', 'name': 'onBtn' }
  ]
});

export class StylesheetCssVarsBasicScenarioSuite {
  private static readonly pipeline = Object.freeze(['intake:hex', 'resolve:roles', 'emit:cssVars']);

  private static readonly scenarios: readonly ScenarioInterface<CssVarsBasicInputInterface, CssVarsScenarioOutputEntity.Type>[] = Object.freeze([
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=2, scenario=single-role] no throw');
        if (output === undefined) {
          throw new Error('[cell=2, scenario=single-role] output is defined');
        }
        const cssVars = output.cssVars;
        assert.ok(cssVars.rootBlock.startsWith(':root {'), '[cell=2, scenario=single-role] rootBlock opens :root');
        assert.match(cssVars.rootBlock, StylesheetCellsOneToThreeScenarioPatterns.PRIMARY_VARIABLE, '[cell=2, scenario=single-role] --c-primary declared in rootBlock');
        assert.strictEqual(Object.keys(cssVars.map).length, 1, '[cell=2, scenario=single-role] map has one entry');
        assert.strictEqual(cssVars.map.primary, '--c-primary', '[cell=2, scenario=single-role] map entry is --c-primary');
        assert.ok(cssVars.full.includes(':root {'), '[cell=2, scenario=single-role] full contains :root block');
      },
      'input': {
        'colors': ['#5b21b6'],
        'pipeline': StylesheetCssVarsBasicScenarioSuite.pipeline,
        'roles': StylesheetCellsOneToThree.SINGLE_ROLE_SCHEMA
      },
      'kind': 'happy',
      'name': 'single-role palette writes :root block and map'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=2, scenario=two-roles] no throw');
        if (output === undefined) {
          throw new Error('[cell=2, scenario=two-roles] output is defined');
        }
        const cssVars = output.cssVars;
        assert.match(cssVars.rootBlock, StylesheetCellsOneToThreeScenarioPatterns.PRIMARY_VARIABLE, '[cell=2, scenario=two-roles] primary var declared');
        assert.match(cssVars.rootBlock, StylesheetCellsOneToThreeScenarioPatterns.SECONDARY_VARIABLE, '[cell=2, scenario=two-roles] secondary var declared');
        assert.strictEqual(Object.keys(cssVars.map).length, 2, '[cell=2, scenario=two-roles] map has two entries');
        assert.strictEqual(cssVars.map.primary, '--c-primary', '[cell=2, scenario=two-roles] primary mapped');
        assert.strictEqual(cssVars.map.secondary, '--c-secondary', '[cell=2, scenario=two-roles] secondary mapped');
      },
      'input': {
        'colors': ['#5b21b6', '#c4b5fd'],
        'pipeline': StylesheetCssVarsBasicScenarioSuite.pipeline,
        'roles': StylesheetCellsOneToThree.TWO_ROLE_SCHEMA
      },
      'kind': 'happy',
      'name': 'two-role palette writes one var per role and complete map'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=2, scenario=all-roles] no throw');
        if (output === undefined) {
          throw new Error('[cell=2, scenario=all-roles] output is defined');
        }
        const cssVars = output.cssVars;
        for (let index = 0; index < allIntentRoles.roles.length; index += 1) {
          const role = allIntentRoles.roles[index];
          if (role === undefined) {
            throw new Error('[cell=2, scenario=all-roles] role is defined');
          }
          const variableSuffix = StylesheetCssVarsBasicScenarioSuite.variableSuffix(role.name);
          assert.ok(role.name in cssVars.map, `[cell=2, scenario=all-roles] map contains role '${role.name}'`);
          assert.ok(cssVars.rootBlock.includes(`--c-${variableSuffix}:`), `[cell=2, scenario=all-roles] rootBlock declares --c-${variableSuffix}`);
        }
      },
      'input': {
        'colors': ['#1a1a2e', '#e0e0e0', '#7b2d8b', '#888', '#b00020', '#388e3c', '#0066cc', '#1976d2', '#ffffff', '#fff9c4'],
        'pipeline': StylesheetCssVarsBasicScenarioSuite.pipeline,
        'roles': allIntentRoles
      },
      'kind': 'happy',
      'name': 'all-intent roles produce one var per role'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=2, scenario=output-shape] no throw');
        if (output === undefined) {
          throw new Error('[cell=2, scenario=output-shape] output is defined');
        }
        const cssVars = output.cssVars;
        assert.strictEqual(typeof cssVars.rootBlock, 'string', '[cell=2, scenario=output-shape] rootBlock is string');
        assert.strictEqual(typeof cssVars.scopedBlock, 'string', '[cell=2, scenario=output-shape] scopedBlock is string');
        assert.strictEqual(typeof cssVars.darkScheme, 'string', '[cell=2, scenario=output-shape] darkScheme is string');
        assert.strictEqual(typeof cssVars.forcedColors, 'string', '[cell=2, scenario=output-shape] forcedColors is string');
        assert.strictEqual(typeof cssVars.wideGamut, 'string', '[cell=2, scenario=output-shape] wideGamut is string');
        assert.strictEqual(typeof cssVars.full, 'string', '[cell=2, scenario=output-shape] full is string');
        assert.strictEqual(typeof cssVars.map, 'object', '[cell=2, scenario=output-shape] map is object');
      },
      'input': {
        'colors': ['#000000'],
        'pipeline': StylesheetCssVarsBasicScenarioSuite.pipeline,
        'roles': StylesheetCellsOneToThree.SINGLE_ROLE_SCHEMA
      },
      'kind': 'edge',
      'name': 'output shape has all required fields even with single-role palette'
    }
  ]);

  static async run(): Promise<void> {
    await new ScenarioRunner<CssVarsBasicInputInterface, CssVarsScenarioOutputEntity.Type>(
      'StylesheetPlugin :: cell-2 :: emit:cssVars.basic',
      StylesheetCssVarsBasicScenarioSuite.runScenario
    ).run(StylesheetCssVarsBasicScenarioSuite.scenarios);
  }

  private static runScenario(input: CssVarsBasicInputInterface): CssVarsScenarioOutputEntity.Type {
    const engine = StylesheetScenarioFixture.engine();
    engine.pipeline(input.pipeline);
    const state = engine.run(StylesheetScenarioFixture.input(input.colors, input.roles));
    const result = CssVarsScenarioOutputEntity.intake({ 'cssVars': state.outputs['stylesheet:cssVars'] });
    return result;
  }

  private static variableSuffix(roleName: string): string {
    const result = roleName.replace(StylesheetCellsOneToThreeScenarioPatterns.UPPERCASE_CHARACTER, StylesheetCssVarsBasicScenarioSuite.toKebabCase);
    return result;
  }

  private static toKebabCase(match: string): string {
    const result = `-${match.toLowerCase()}`;
    return result;
  }
}
