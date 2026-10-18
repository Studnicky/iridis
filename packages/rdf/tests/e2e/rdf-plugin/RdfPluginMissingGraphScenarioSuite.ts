import { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioClassificationEntity } from '../../_runner/ScenarioClassificationEntity.ts';
import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { RdfPluginMissingGraphScenarioEntity } from './RdfPluginMissingGraphScenarioEntity.ts';
import { RdfPluginScenarioFixture } from './RdfPluginScenarioFixture.ts';

/** E2E cell 6: serializer behavior without a prior annotation graph. */
export class RdfPluginMissingGraphScenarioSuite {
  static async run(): Promise<void> {
    const scenarios: readonly ScenarioInterface<undefined, RdfPluginMissingGraphScenarioEntity.Type>[] = [
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'serializer without a graph does not throw');
          assert.ok(output !== undefined, 'serializer without a graph returns output');
          assert.strictEqual(output.reasoningGraphWritten, false, 'serializer does not synthesize an annotation graph');
          assert.strictEqual(output.serializedOutputWritten, false, 'serializer does not write partial serialized output');
        },
        'classification': ScenarioClassificationEntity.intake('unhappy'),
        'input': undefined,
        'name': 'serializer skips cleanly when annotation did not produce a graph'
      }
    ];
    const runner = new ScenarioRunner<undefined, RdfPluginMissingGraphScenarioEntity.Type>(
      'RdfPlugin :: cell-6 :: serialize-missing-graph',
      (): RdfPluginMissingGraphScenarioEntity.Type => {
        const roles = RoleSchemaInterfaceTypeEntity.intake({
          'name': 'missing-graph',
          'roles': [{ 'name': 'primary', 'required': true }, { 'name': 'background', 'required': true }]
        });
        const input = RdfPluginScenarioFixture.createInput(['#5b21b6', '#ffffff'], roles);
        const engine = RdfPluginScenarioFixture.createEngine();
        engine.pipeline(['intake:hex', 'resolve:roles', 'reason:serialize']);
        const state = engine.run(input);
        const result = RdfPluginMissingGraphScenarioEntity.intake({
          'reasoningGraphWritten': RdfPluginScenarioFixture.graphFrom(state) !== undefined,
          'serializedOutputWritten': RdfPluginScenarioFixture.serializedFrom(state) !== undefined
        });
        return result;
      }
    );
    await runner.run(scenarios);
  }
}
