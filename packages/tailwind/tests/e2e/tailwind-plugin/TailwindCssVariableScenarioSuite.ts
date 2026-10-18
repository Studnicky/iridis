import type { TailwindOutputInterface } from '@studnicky/iridis-tailwind';

import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { TailwindPluginScenarioEntity } from './entities/TailwindPluginScenarioEntity.ts';

/** E2E cell 5: CSS variable prefixing and document shape. */
export class TailwindCssVariableScenarioSuite {
  private static occurrences(text: string, search: string): number {
    let count = 0;
    let position = text.indexOf(search);
    while (position !== -1) {
      count += 1;
      position = text.indexOf(search, position + search.length);
    }
    return count;
  }

  static run(): void {
    const scenarios: readonly ScenarioInterface<TailwindPluginScenarioEntity.InputInterface, TailwindOutputInterface>[] = [
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=5, scenario=default-prefix] no throw');
          assert.ok(output !== undefined, '[cell=5, scenario=default-prefix] output present');
          assert.ok(output.cssVars.includes(':root {'), '[cell=5, scenario=default-prefix] :root block present');
          assert.ok(output.cssVars.includes('--c-accent:'), '[cell=5, scenario=default-prefix] --c-accent declaration present');
        },
        'input': {
          'colors': ['#8b5cf6'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['accent'])
        },
        'name': 'default --c- prefix applied to role name in :root block'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=5, scenario=custom-prefix] no throw');
          assert.ok(output !== undefined, '[cell=5, scenario=custom-prefix] output present');
          assert.ok(output.cssVars.includes('--theme-brand:'), '[cell=5, scenario=custom-prefix] custom prefix applied');
          assert.ok(!output.cssVars.includes('--c-brand'), '[cell=5, scenario=custom-prefix] default prefix absent');
        },
        'input': {
          'colors': ['#8b5cf6'],
          'metadata': { 'cssVarPrefix': '--theme-' },
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['brand'])
        },
        'name': 'custom cssVarPrefix from metadata overrides default --c-'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=5, scenario=role-once] no throw');
          assert.ok(output !== undefined, '[cell=5, scenario=role-once] output present');
          assert.strictEqual(TailwindCssVariableScenarioSuite.occurrences(output.cssVars, '--c-critical:'), 1,
            '[cell=5, scenario=role-once] --c-critical appears exactly once');
          assert.strictEqual(TailwindCssVariableScenarioSuite.occurrences(output.cssVars, '--c-positive:'), 1,
            '[cell=5, scenario=role-once] --c-positive appears exactly once');
        },
        'input': {
          'colors': ['#ef4444', '#22c55e'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['critical', 'positive'])
        },
        'name': 'each role appears exactly once in the :root block'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=5, scenario=well-formed] no throw');
          assert.ok(output !== undefined, '[cell=5, scenario=well-formed] output present');
          assert.ok(output.cssVars.trimEnd().endsWith('}'), '[cell=5, scenario=well-formed] cssVars ends with closing brace');
        },
        'input': {
          'colors': ['#3b82f6'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['link'])
        },
        'name': 'cssVars string ends with closing brace (well-formed CSS block)'
      }
    ];

    new ScenarioRunner<TailwindPluginScenarioEntity.InputInterface, TailwindOutputInterface>(
      'TailwindPlugin :: cell-5 :: css-var-emission',
      (input) => {
        const engine = TailwindPluginScenarioEntity.Factory.createEngine();
        engine.pipeline(['intake:hex', 'resolve:roles', 'emit:tailwindTheme']);
        const state = engine.run(TailwindPluginScenarioEntity.Factory.createInput(input));
        const result = TailwindPluginScenarioEntity.Factory.outputFrom(state);
        return result;
      }
    ).run(scenarios);
  }
}
