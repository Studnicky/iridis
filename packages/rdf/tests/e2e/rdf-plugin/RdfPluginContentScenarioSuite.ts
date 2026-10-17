import type { InputInterfaceTypeEntity } from '@studnicky/iridis';

import { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioClassificationEntity } from '../../_runner/ScenarioClassificationEntity.ts';
import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { RdfPluginContentScenarioEntity } from './RdfPluginContentScenarioEntity.ts';
import { RdfPluginScenarioFixture } from './RdfPluginScenarioFixture.ts';

/** E2E cell 5: semantic RDF content for roles, colors, and gamut channels. */
export class RdfPluginContentScenarioSuite {
  static async run(): Promise<void> {
    const simpleRoles = RoleSchemaInterfaceTypeEntity.intake({
      'name': 'content-simple',
      'roles': [{ 'name': 'primary', 'required': true }, { 'name': 'background', 'required': true }]
    });
    const wideGamutRoles = RoleSchemaInterfaceTypeEntity.intake({
      'name': 'content-wide-gamut',
      'roles': [
        { 'chromaRange': [0, 0.5], 'intent': 'accent', 'lightnessRange': [0.05, 0.95], 'name': 'accent', 'required': true },
        { 'chromaRange': [0, 0.03], 'intent': 'background', 'lightnessRange': [0.05, 0.15], 'name': 'background', 'required': true }
      ]
    });
    const scenarios: readonly ScenarioInterface<InputInterfaceTypeEntity.Type, RdfPluginContentScenarioEntity.Type>[] = [
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'semantic content serialization does not throw');
          assert.ok(output !== undefined, 'semantic content serialization returns output');
          assert.ok(output.serialized.includes('https://studnicky.dev/iridis/role/primary'), 'Turtle contains primary role IRI');
          assert.ok(output.serialized.includes('https://studnicky.dev/iridis/role/background'), 'Turtle contains background role IRI');
          assert.ok(output.serialized.includes('https://studnicky.dev/iridis/color/'), 'Turtle contains color IRI namespace');
          assert.ok(output.serialized.includes('wcag21Ratio'), 'Turtle contains contrast literals');
        },
        'classification': ScenarioClassificationEntity.intake('happy'),
        'input': RdfPluginScenarioFixture.createInput(['#5b21b6', '#ffffff'], simpleRoles),
        'name': 'resolved role and color relationships serialize under stable IRIs'
      },
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'sRGB content serialization does not throw');
          assert.ok(output !== undefined, 'sRGB content serialization returns output');
          assert.strictEqual(output.accentHasDisplayP3, false, 'sRGB primary does not carry a display-P3 record');
          assert.strictEqual(output.backgroundHasDisplayP3, false, 'sRGB background does not carry a display-P3 record');
          assert.ok(!output.graph.includes('displayP3R'), 'sRGB graph omits display-P3 red channel');
          assert.ok(!output.graph.includes('displayP3G'), 'sRGB graph omits display-P3 green channel');
          assert.ok(!output.graph.includes('displayP3B'), 'sRGB graph omits display-P3 blue channel');
        },
        'classification': ScenarioClassificationEntity.intake('happy'),
        'input': RdfPluginScenarioFixture.createInput(['#5b21b6', '#ffffff'], simpleRoles),
        'name': 'sRGB-only colors omit display-P3 channel annotations'
      },
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'wide-gamut content serialization does not throw');
          assert.ok(output !== undefined, 'wide-gamut content serialization returns output');
          assert.strictEqual(output.accentHasDisplayP3, true, 'out-of-sRGB accent carries a display-P3 record');
          assert.strictEqual(output.backgroundHasDisplayP3, false, 'in-gamut background has no display-P3 record');
          assert.ok(output.graph.includes('displayP3R'), 'graph carries display-P3 red channel');
          assert.ok(output.graph.includes('displayP3G'), 'graph carries display-P3 green channel');
          assert.ok(output.graph.includes('displayP3B'), 'graph carries display-P3 blue channel');
        },
        'classification': ScenarioClassificationEntity.intake('edge'),
        'input': RdfPluginScenarioFixture.createInput([
          { 'c': 0.4, 'h': 30, 'l': 0.7 },
          { 'c': 0.01, 'h': 280, 'l': 0.1 }
        ], wideGamutRoles),
        'name': 'wide-gamut accent emits exactly the display-P3 channel vocabulary'
      }
    ];
    const runner = new ScenarioRunner<InputInterfaceTypeEntity.Type, RdfPluginContentScenarioEntity.Type>(
      'RdfPlugin :: cell-5 :: rdf-content',
      (input): RdfPluginContentScenarioEntity.Type => {
        const engine = RdfPluginScenarioFixture.createEngine();
        const firstColor = input.colors.at(0);
        const intakeTask = typeof firstColor === 'string' ? 'intake:hex' : 'intake:oklch';
        engine.pipeline([intakeTask, 'resolve:roles', 'reason:annotate', 'reason:serialize']);
        const state = engine.run(input);
        const graph = RdfPluginScenarioFixture.graphFrom(state);
        const serialized = RdfPluginScenarioFixture.serializedFrom(state);
        if (graph === undefined || serialized === undefined) {
          throw new Error('RDF content pipeline did not emit graph and serialized output');
        }
        const accent = state.roles.accent;
        const background = state.roles.background;
        const result = RdfPluginContentScenarioEntity.intake({
          'accentHasDisplayP3': accent?.displayP3 !== undefined,
          'backgroundHasDisplayP3': background?.displayP3 !== undefined,
          'graph': graph,
          'serialized': serialized
        });
        return result;
      }
    );
    await runner.run(scenarios);
  }
}
