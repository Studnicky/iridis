import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../../_runner/ScenarioRunner.ts';
import { stylesheetPlugin } from '../../../../src/index.ts';

interface PluginShapeOutputInterface {
  readonly 'methods': readonly string[];
  readonly 'name': string;
  readonly 'taskNames': readonly string[];
  readonly 'version': string;
}

export class StylesheetPluginShapeScenarioSuite {
  private static readonly scenarios: readonly ScenarioInterface<true, PluginShapeOutputInterface>[] = Object.freeze([
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=1, scenario=singleton] no throw');
        if (output === undefined) {
          throw new Error('[cell=1, scenario=singleton] output is defined');
        }
        assert.deepStrictEqual(output.methods, ['schemas', 'tasks'], '[cell=1, scenario=singleton] satisfies PluginInterface shape');
        assert.strictEqual(output.name, 'stylesheet', '[cell=1, scenario=singleton] name is stylesheet');
        assert.strictEqual(output.version, '0.1.0', '[cell=1, scenario=singleton] version is 0.1.0');
      },
      'input': true,
      'kind': 'happy',
      'name': 'singleton satisfies the plugin shape with stable name and version'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=1, scenario=task-names] no throw');
        if (output === undefined) {
          throw new Error('[cell=1, scenario=task-names] output is defined');
        }
        assert.deepStrictEqual(
          [...output.taskNames].sort(function compareTaskNames(left, right): number {
            const result = left.localeCompare(right);
            return result;
          }),
          ['emit:cssVars', 'emit:cssVarsScoped'],
          '[cell=1, scenario=task-names] exactly two emit tasks returned'
        );
      },
      'input': true,
      'kind': 'happy',
      'name': 'tasks() returns exactly emit:cssVars and emit:cssVarsScoped'
    }
  ]);

  static async run(): Promise<void> {
    await new ScenarioRunner<true, PluginShapeOutputInterface>(
      'StylesheetPlugin :: cell-1 :: plugin-shape',
      StylesheetPluginShapeScenarioSuite.runScenario
    ).run(StylesheetPluginShapeScenarioSuite.scenarios);
  }

  private static runScenario(_input: true): PluginShapeOutputInterface {
    const methods: string[] = [];
    if (typeof stylesheetPlugin.schemas === 'function') {
      methods.push('schemas');
    }
    if (typeof stylesheetPlugin.tasks === 'function') {
      methods.push('tasks');
    }
    return {
      'methods': methods,
      'name': stylesheetPlugin.name,
      'taskNames': stylesheetPlugin.tasks().map(function taskName(task): string {
        const result = task.name;
        return result;
      }),
      'version': stylesheetPlugin.version
    };
  }
}
