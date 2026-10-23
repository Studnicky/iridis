import type { InputEntity } from '@studnicky/iridis';

import { RoleSchemaEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../../_runner/ScenarioRunner.ts';
import { CssVarsWideGamutScenarioOutputEntity } from '../../../entities/CssVarsWideGamutScenarioOutputEntity.ts';
import { StylesheetRoleSchemas } from '../StylesheetRoleSchemas.ts';
import { StylesheetScenarioFixture } from '../StylesheetScenarioFixture.ts';
import { StylesheetScenarioPatterns } from '../StylesheetScenarioPatterns.ts';
import { StylesheetWideGamutScenarioPatterns } from '../StylesheetWideGamutScenarioPatterns.ts';

interface CellFiveInputInterface {
  readonly 'colors': InputEntity.Type['colors'];
  readonly 'pipeline': readonly string[];
  readonly 'roles': RoleSchemaEntity.Type;
}

/** Frozen behavioral scenarios for emit:cssVars wide-gamut fallback chains. */
export class StylesheetCellFiveScenarioSuite {
  private static readonly oklchPipeline = Object.freeze(['intake:oklch', 'resolve:roles', 'emit:cssVars']);
  private static readonly p3Pipeline = Object.freeze(['intake:p3', 'resolve:roles', 'emit:cssVars']);
  private static readonly srgbPipeline = Object.freeze(['intake:hex', 'resolve:roles', 'emit:cssVars']);
  private static readonly wideGamutRoles = RoleSchemaEntity.intake({
    'name': 'wide-gamut',
    'roles': [{
      'chromaRange': [0, 0.5],
      'intent': 'accent',
      'lightnessRange': [0.05, 0.95],
      'name': 'primary',
      'required': true
    }]
  });

  private static readonly scenarios = Object.freeze([
    {
      'assert': function(output, error): void {
        assert.strictEqual(error, undefined, '[cell=5, scenario=srgb-only] no throw');
        assert.ok(output !== undefined, '[cell=5, scenario=srgb-only] output present');
        const cssVars = output.cssVars;
        assert.strictEqual(cssVars.wideGamut, '',
          '[cell=5, scenario=srgb-only] wideGamut is empty string for sRGB-only input');
        assert.ok(!cssVars.full.includes('@supports'),
          '[cell=5, scenario=srgb-only] full contains no @supports block');
        assert.ok(!cssVars.full.includes('display-p3'),
          '[cell=5, scenario=srgb-only] full contains no display-p3 syntax');
      },
      'input': { 'colors': ['#5b21b6'], 'pipeline': StylesheetCellFiveScenarioSuite.srgbPipeline, 'roles': StylesheetRoleSchemas.single },
      'kind': 'happy',
      'name': 'sRGB-only input produces empty wideGamut and no @supports in full'
    },
    {
      'assert': function(output, error): void {
        assert.strictEqual(error, undefined, '[cell=5, scenario=oklch-out-of-srgb] no throw');
        assert.ok(output !== undefined, '[cell=5, scenario=oklch-out-of-srgb] output present');
        const cssVars = output.cssVars;
        assert.match(cssVars.rootBlock, StylesheetWideGamutScenarioPatterns.ROOT_FALLBACK,
          '[cell=5, scenario=oklch-out-of-srgb] rootBlock carries gamut-mapped hex');
        assert.ok(cssVars.wideGamut.length > 0,
          '[cell=5, scenario=oklch-out-of-srgb] wideGamut block emitted');
        assert.match(cssVars.wideGamut, StylesheetScenarioPatterns.P3_SUPPORTS_PATTERN,
          '[cell=5, scenario=oklch-out-of-srgb] wideGamut uses P3 feature-detection query');
        assert.match(cssVars.wideGamut, StylesheetWideGamutScenarioPatterns.DISPLAY_P3_VARIABLE,
          '[cell=5, scenario=oklch-out-of-srgb] wideGamut declares P3 value for --c-primary');
        assert.ok(output.displayP3 !== undefined,
          '[cell=5, scenario=oklch-out-of-srgb] displayP3 populated on role record');
      },
      'input': { 'colors': [{ 'c': 0.4, 'h': 30, 'l': 0.7 }], 'pipeline': StylesheetCellFiveScenarioSuite.oklchPipeline, 'roles': StylesheetCellFiveScenarioSuite.wideGamutRoles },
      'kind': 'happy',
      'name': 'out-of-sRGB OKLCH populates displayP3 and emits @supports wideGamut block'
    },
    {
      'assert': function(output, error): void {
        assert.strictEqual(error, undefined, '[cell=5, scenario=intake-p3] no throw');
        assert.ok(output !== undefined, '[cell=5, scenario=intake-p3] output present');
        const wideGamut = output.cssVars.wideGamut;
        assert.ok(wideGamut.length > 0,
          '[cell=5, scenario=intake-p3] wideGamut block emitted');
        assert.ok(wideGamut.includes('color(display-p3 0.9900 0.4200 0.1800)'),
          `[cell=5, scenario=intake-p3] P3 value serialized at 4dp, got:\n${wideGamut}`);
      },
      'input': { 'colors': ['color(display-p3 0.99 0.42 0.18)'], 'pipeline': StylesheetCellFiveScenarioSuite.p3Pipeline, 'roles': StylesheetCellFiveScenarioSuite.wideGamutRoles },
      'kind': 'happy',
      'name': 'intake:p3 string input preserves displayP3 at 4dp precision'
    },
    {
      'assert': function(output, error): void {
        assert.strictEqual(error, undefined, '[cell=5, scenario=supports-wrapper] no throw');
        assert.ok(output !== undefined, '[cell=5, scenario=supports-wrapper] output present');
        const wideGamut = output.cssVars.wideGamut;
        assert.match(wideGamut, StylesheetWideGamutScenarioPatterns.SUPPORTS_WRAPPER,
          '[cell=5, scenario=supports-wrapper] wideGamut string opens with @supports');
        assert.match(wideGamut, StylesheetWideGamutScenarioPatterns.ROOT_BLOCK,
          '[cell=5, scenario=supports-wrapper] @supports block contains :root block');
      },
      'input': { 'colors': [{ 'c': 0.4, 'h': 30, 'l': 0.7 }], 'pipeline': StylesheetCellFiveScenarioSuite.oklchPipeline, 'roles': StylesheetCellFiveScenarioSuite.wideGamutRoles },
      'kind': 'edge',
      'name': 'wideGamut block emitted inside @supports query wrapper'
    }
  ] satisfies readonly ScenarioInterface<CellFiveInputInterface, CssVarsWideGamutScenarioOutputEntity.Type>[]);

  static async run(): Promise<void> {
    const runner = new ScenarioRunner<CellFiveInputInterface, CssVarsWideGamutScenarioOutputEntity.Type>(
      'StylesheetPlugin :: cell-5 :: emit:cssVars.wide-gamut',
      StylesheetCellFiveScenarioSuite.runScenario
    );
    await runner.run(StylesheetCellFiveScenarioSuite.scenarios);
  }

  private static runScenario(input: CellFiveInputInterface): CssVarsWideGamutScenarioOutputEntity.Type {
    const engine = StylesheetScenarioFixture.engine();
    engine.pipeline([...input.pipeline]);
    const state = engine.run(StylesheetScenarioFixture.input(input.colors, input.roles));
    const displayP3 = state.roles.primary?.displayP3;
    const candidate = displayP3 === undefined
      ? { 'cssVars': state.outputs['stylesheet:cssVars'] }
      : { 'cssVars': state.outputs['stylesheet:cssVars'], 'displayP3': displayP3 };
    const result = CssVarsWideGamutScenarioOutputEntity.intake(candidate);
    return result;
  }
}
