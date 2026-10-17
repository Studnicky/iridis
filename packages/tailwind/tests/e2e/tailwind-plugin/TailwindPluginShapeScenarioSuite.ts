import { tailwindPlugin, TailwindPlugin } from '@studnicky/iridis-tailwind';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { TailwindPluginShapeScenarioOutputEntity } from './entities/TailwindPluginShapeScenarioOutputEntity.ts';

/** E2E cell 1: public plugin identity and task registration. */
export class TailwindPluginShapeScenarioSuite {
  static run(): void {
    const scenarios: readonly ScenarioInterface<true, TailwindPluginShapeScenarioOutputEntity.Type>[] = [
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=1, scenario=instance] no throw');
          assert.strictEqual(output?.name, 'tailwind', '[cell=1, scenario=instance] name is tailwind');
          assert.strictEqual(output?.version, '0.1.0', '[cell=1, scenario=instance] version is 0.1.0');
        },
        'input': true,
        'name': 'tailwindPlugin is an instance of TailwindPlugin with correct name and version'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=1, scenario=tasks] no throw');
          assert.deepStrictEqual(output?.taskNames, ['emit:tailwindTheme'],
            '[cell=1, scenario=tasks] exactly one task registered');
        },
        'input': true,
        'name': 'tasks() returns exactly [emit:tailwindTheme]'
      }
    ];

    new ScenarioRunner<true, TailwindPluginShapeScenarioOutputEntity.Type>(
      'TailwindPlugin :: cell-1 :: plugin-shape',
      () => {
        assert.ok(tailwindPlugin instanceof TailwindPlugin, '[cell=1] tailwindPlugin instanceof TailwindPlugin');
        const result = TailwindPluginShapeScenarioOutputEntity.create({
          'name': tailwindPlugin.name,
          'taskNames': tailwindPlugin.tasks().map((task) => {return task.name;}),
          'version': tailwindPlugin.version
        });
        return result;
      }
    ).run(scenarios);
  }
}
