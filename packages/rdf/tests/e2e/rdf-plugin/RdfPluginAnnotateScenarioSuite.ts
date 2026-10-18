import type { InputInterfaceTypeEntity } from '@studnicky/iridis';

import { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioClassificationEntity } from '../../_runner/ScenarioClassificationEntity.ts';
import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { RdfPluginAnnotateScenarioEntity } from './RdfPluginAnnotateScenarioEntity.ts';
import { RdfPluginScenarioFixture } from './RdfPluginScenarioFixture.ts';

/** E2E cell 3: N-Quads annotation graph construction. */
export class RdfPluginAnnotateScenarioSuite {
  static async run(): Promise<void> {
    const simpleRoles = RoleSchemaInterfaceTypeEntity.intake({
      'name': 'simple',
      'roles': [{ 'name': 'primary', 'required': true }, { 'name': 'background', 'required': true }]
    });
    const threeRoles = RoleSchemaInterfaceTypeEntity.intake({
      'name': 'three-role',
      'roles': [
        { 'name': 'primary', 'required': true },
        { 'name': 'secondary', 'required': true },
        { 'name': 'background', 'required': true }
      ]
    });
    const wideGamutRoles = RoleSchemaInterfaceTypeEntity.intake({
      'name': 'wide-gamut',
      'roles': [
        { 'chromaRange': [0, 0.5], 'intent': 'accent', 'lightnessRange': [0.05, 0.95], 'name': 'accent', 'required': true },
        { 'chromaRange': [0, 0.03], 'intent': 'background', 'lightnessRange': [0.05, 0.15], 'name': 'background', 'required': true }
      ]
    });
    const scenarios: readonly ScenarioInterface<InputInterfaceTypeEntity.Type, RdfPluginAnnotateScenarioEntity.Type>[] = [
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'two-color annotation does not throw');
          assert.ok(output !== undefined, 'two-color annotation returns output');
          assert.ok(output.graph.includes('<https://studnicky.dev/iridis/role/primary>'), 'graph contains primary role IRI');
          assert.ok(output.graph.includes('<https://studnicky.dev/iridis/role/background>'), 'graph contains background role IRI');
          assert.ok(output.serialized !== undefined, 'serialize task writes Turtle');
          assert.strictEqual(output.serialized.split('wcag21Ratio').length - 1, 2, 'two roles emit both directed contrast pairs');
        },
        'classification': ScenarioClassificationEntity.intake('happy'),
        'input': RdfPluginScenarioFixture.createInput(['#5b21b6', '#ffffff'], simpleRoles),
        'name': 'two resolved roles yield serialized N-Quads and both directed contrast pairs'
      },
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'three-color annotation does not throw');
          assert.ok(output !== undefined, 'three-color annotation returns output');
          assert.strictEqual(output.resolvedRoleCount, 3, 'all three roles resolve');
          assert.ok(output.serialized !== undefined, 'serialize task writes Turtle');
          assert.strictEqual(output.serialized.split('wcag21Ratio').length - 1, 6, 'three roles emit six directed contrast pairs');
        },
        'classification': ScenarioClassificationEntity.intake('edge'),
        'input': RdfPluginScenarioFixture.createInput(['#5b21b6', '#ffffff', '#000000'], threeRoles),
        'name': 'three resolved roles yield the complete directed contrast cross-product'
      },
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'wide-gamut annotation does not throw');
          assert.ok(output !== undefined, 'wide-gamut annotation returns output');
          assert.ok(output.graph.includes('displayP3R'), 'out-of-sRGB accent retains display-P3 red channel annotation');
          assert.ok(output.graph.includes('displayP3G'), 'out-of-sRGB accent retains display-P3 green channel annotation');
          assert.ok(output.graph.includes('displayP3B'), 'out-of-sRGB accent retains display-P3 blue channel annotation');
        },
        'classification': ScenarioClassificationEntity.intake('edge'),
        'input': RdfPluginScenarioFixture.createInput([
          { 'c': 0.4, 'h': 30, 'l': 0.7 },
          { 'c': 0.01, 'h': 280, 'l': 0.1 }
        ], wideGamutRoles),
        'name': 'wide-gamut annotation carries display-P3 channels in the N-Quads graph'
      }
    ];
    const runner = new ScenarioRunner<InputInterfaceTypeEntity.Type, RdfPluginAnnotateScenarioEntity.Type>(
      'RdfPlugin :: cell-3 :: reason-annotate',
      (input): RdfPluginAnnotateScenarioEntity.Type => {
        const engine = RdfPluginScenarioFixture.createEngine();
        engine.pipeline(['intake:any', 'resolve:roles', 'reason:annotate', 'reason:serialize']);
        const state = engine.run(input);
        const graph = RdfPluginScenarioFixture.graphFrom(state);
        if (graph === undefined) {
          throw new Error('reason:annotate did not write rdf:reasoningGraph');
        }
        const serialized = RdfPluginScenarioFixture.serializedFrom(state);
        const result = RdfPluginAnnotateScenarioEntity.intake({
          'graph': graph,
          'resolvedRoleCount': Object.keys(state.roles).length,
          ...(serialized === undefined ? {} : { 'serialized': serialized })
        });
        return result;
      }
    );
    await runner.run(scenarios);
  }
}
