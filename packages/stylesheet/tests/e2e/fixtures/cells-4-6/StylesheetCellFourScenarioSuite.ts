import type { InputInterfaceTypeEntity } from '@studnicky/iridis';

import { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../../_runner/ScenarioRunner.ts';
import { CssVarsScenarioOutputEntity } from '../../../entities/CssVarsScenarioOutputEntity.ts';
import { StylesheetNamingScenarioPatterns } from '../StylesheetNamingScenarioPatterns.ts';
import { StylesheetRoleSchemas } from '../StylesheetRoleSchemas.ts';
import { StylesheetScenarioFixture } from '../StylesheetScenarioFixture.ts';

interface CellFourInputInterface {
  readonly 'colors': InputInterfaceTypeEntity.Type['colors'];
  readonly 'metadata': InputInterfaceTypeEntity.Type['metadata'];
  readonly 'roles': RoleSchemaInterfaceTypeEntity.Type;
}

/** Frozen behavioral scenarios for emit:cssVars custom-property naming. */
export class StylesheetCellFourScenarioSuite {
  private static readonly camelRoles = RoleSchemaInterfaceTypeEntity.intake({
    'name': 'camel',
    'roles': [
      { 'name': 'primaryText', 'required': true },
      { 'name': 'onBackground', 'required': true }
    ]
  });

  private static readonly pipeline = Object.freeze(['intake:hex', 'resolve:roles', 'emit:cssVars']);

  private static readonly scenarios = Object.freeze([
    {
      'assert': function(output, error): void {
        assert.strictEqual(error, undefined, '[cell=4, scenario=default-prefix] no throw');
        assert.ok(output !== undefined, '[cell=4, scenario=default-prefix] output present');
        assert.match(output.cssVars.rootBlock, StylesheetNamingScenarioPatterns.DEFAULT_PREFIX,
          '[cell=4, scenario=default-prefix] default --c- prefix used');
      },
      'input': { 'colors': ['#5b21b6'], 'metadata': {}, 'roles': StylesheetRoleSchemas.single },
      'kind': 'happy',
      'name': 'default --c- prefix applied to role vars'
    },
    {
      'assert': function(output, error): void {
        assert.strictEqual(error, undefined, '[cell=4, scenario=custom-prefix] no throw');
        assert.ok(output !== undefined, '[cell=4, scenario=custom-prefix] output present');
        const rootBlock = output.cssVars.rootBlock;
        assert.match(rootBlock, StylesheetNamingScenarioPatterns.CUSTOM_PREFIX,
          '[cell=4, scenario=custom-prefix] --brand- prefix used in rootBlock');
        assert.ok(!rootBlock.includes('--c-primary'),
          '[cell=4, scenario=custom-prefix] default --c- prefix absent');
        assert.strictEqual(output.cssVars.map.primary, '--brand-primary',
          '[cell=4, scenario=custom-prefix] map reflects custom prefix');
      },
      'input': { 'colors': ['#5b21b6'], 'metadata': { 'cssVarPrefix': '--brand-' }, 'roles': StylesheetRoleSchemas.single },
      'kind': 'happy',
      'name': 'custom cssVarPrefix overrides default --c- prefix'
    },
    {
      'assert': function(output, error): void {
        assert.strictEqual(error, undefined, '[cell=4, scenario=camel-kebab] no throw');
        assert.ok(output !== undefined, '[cell=4, scenario=camel-kebab] output present');
        const cssVars = output.cssVars;
        assert.match(cssVars.rootBlock, StylesheetNamingScenarioPatterns.CAMEL_PRIMARY_TEXT,
          '[cell=4, scenario=camel-kebab] primaryText → --c-primary-text');
        assert.match(cssVars.rootBlock, StylesheetNamingScenarioPatterns.CAMEL_ON_BACKGROUND,
          '[cell=4, scenario=camel-kebab] onBackground → --c-on-background');
        assert.strictEqual(cssVars.map.primaryText, '--c-primary-text',
          '[cell=4, scenario=camel-kebab] map entry kebab-cased for primaryText');
        assert.strictEqual(cssVars.map.onBackground, '--c-on-background',
          '[cell=4, scenario=camel-kebab] map entry kebab-cased for onBackground');
      },
      'input': { 'colors': ['#5b21b6', '#c4b5fd'], 'metadata': {}, 'roles': StylesheetCellFourScenarioSuite.camelRoles },
      'kind': 'edge',
      'name': 'camelCase role names are kebab-cased in emitted vars'
    },
    {
      'assert': function(output, error): void {
        assert.strictEqual(error, undefined, '[cell=4, scenario=scoped-default] no throw');
        assert.ok(output !== undefined, '[cell=4, scenario=scoped-default] output present');
        assert.match(output.cssVars.scopedBlock, StylesheetNamingScenarioPatterns.DEFAULT_SCOPE,
          "[cell=4, scenario=scoped-default] default scopedBlock uses [data-theme='default']");
      },
      'input': { 'colors': ['#5b21b6'], 'metadata': {}, 'roles': StylesheetRoleSchemas.single },
      'kind': 'happy',
      'name': 'scopedBlock uses data-theme selector by default'
    },
    {
      'assert': function(output, error): void {
        assert.strictEqual(error, undefined, '[cell=4, scenario=scoped-attr] no throw');
        assert.ok(output !== undefined, '[cell=4, scenario=scoped-attr] output present');
        assert.match(output.cssVars.scopedBlock, StylesheetNamingScenarioPatterns.CUSTOM_SCOPE,
          "[cell=4, scenario=scoped-attr] scopedBlock uses custom [data-scheme='light']");
      },
      'input': { 'colors': ['#5b21b6'], 'metadata': { 'scopeAttr': 'data-scheme', 'themeName': 'light' }, 'roles': StylesheetRoleSchemas.single },
      'kind': 'happy',
      'name': 'scopeAttr metadata changes the scoped attribute name'
    }
  ] satisfies readonly ScenarioInterface<CellFourInputInterface, CssVarsScenarioOutputEntity.Type>[]);

  static async run(): Promise<void> {
    const runner = new ScenarioRunner<CellFourInputInterface, CssVarsScenarioOutputEntity.Type>(
      'StylesheetPlugin :: cell-4 :: emit:cssVars.naming',
      StylesheetCellFourScenarioSuite.runScenario
    );
    await runner.run(StylesheetCellFourScenarioSuite.scenarios);
  }

  private static runScenario(input: CellFourInputInterface): CssVarsScenarioOutputEntity.Type {
    const engine = StylesheetScenarioFixture.engine();
    engine.pipeline([...StylesheetCellFourScenarioSuite.pipeline]);
    const state = engine.run(StylesheetScenarioFixture.input(input.colors, input.roles, input.metadata));
    const result = CssVarsScenarioOutputEntity.intake({ 'cssVars': state.outputs['stylesheet:cssVars'] });
    return result;
  }
}
