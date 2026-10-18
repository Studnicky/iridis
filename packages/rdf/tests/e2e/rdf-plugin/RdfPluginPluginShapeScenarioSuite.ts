import { RdfPlugin, rdfPlugin, reasonAnnotate, reasonSerialize } from '@studnicky/iridis-rdf';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioClassificationEntity } from '../../_runner/ScenarioClassificationEntity.ts';
import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { RdfPluginPluginShapeScenarioEntity } from './RdfPluginPluginShapeScenarioEntity.ts';

/** E2E cell 1: public plugin identity and registered task contract. */
export class RdfPluginPluginShapeScenarioSuite {
  static async run(): Promise<void> {
    const scenarios: readonly ScenarioInterface<undefined, RdfPluginPluginShapeScenarioEntity.Type>[] = [
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'singleton inspection does not throw');
          assert.ok(output !== undefined, 'singleton inspection returns output');
          assert.strictEqual(output.pluginInstanceMatchesClass, true, 'rdfPlugin is an RdfPlugin');
          assert.strictEqual(output.pluginName, 'rdf', 'plugin name is rdf');
          assert.strictEqual(output.pluginVersion, '0.1.0', 'plugin version is stable');
        },
        'classification': ScenarioClassificationEntity.intake('happy'),
        'input': undefined,
        'name': 'singleton exposes the public plugin identity'
      },
      {
        'assert': ({ 'error': error, 'output': output }): void => {
          assert.strictEqual(error, undefined, 'task inspection does not throw');
          assert.ok(output !== undefined, 'task inspection returns output');
          const taskNames = output.taskNames.toSorted((left, right) => {
            const result = left.localeCompare(right);
            return result;
          });
          assert.deepStrictEqual(taskNames, ['reason:annotate', 'reason:serialize'], 'plugin publishes exactly its RDF tasks');
          assert.strictEqual(output.annotateTaskMatchesExport, true, 'annotate task is the exported singleton');
          assert.strictEqual(output.serializeTaskMatchesExport, true, 'serialize task is the exported singleton');
        },
        'classification': ScenarioClassificationEntity.intake('edge'),
        'input': undefined,
        'name': 'task registration preserves exported singleton identities'
      }
    ];
    const runner = new ScenarioRunner<undefined, RdfPluginPluginShapeScenarioEntity.Type>(
      'RdfPlugin :: cell-1 :: plugin-shape',
      (): RdfPluginPluginShapeScenarioEntity.Type => {
        const tasks = rdfPlugin.tasks();
        const result = RdfPluginPluginShapeScenarioEntity.intake({
          'annotateTaskMatchesExport': tasks.includes(reasonAnnotate),
          'pluginInstanceMatchesClass': rdfPlugin instanceof RdfPlugin,
          'pluginName': rdfPlugin.name,
          'pluginVersion': rdfPlugin.version,
          'serializeTaskMatchesExport': tasks.includes(reasonSerialize),
          'taskNames': tasks.map((task) => { return task.name; })
        });
        return result;
      }
    );
    await runner.run(scenarios);
  }
}
