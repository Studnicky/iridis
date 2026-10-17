import type { TailwindOutputInterface } from '@studnicky/iridis-tailwind';

import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { TailwindPluginScenarioEntity } from './entities/TailwindPluginScenarioEntity.ts';

/** E2E cell 2: emitted Tailwind config shape for representative palettes. */
export class TailwindThemeConfigScenarioSuite {
  static run(): void {
    const scenarios: readonly ScenarioInterface<TailwindPluginScenarioEntity.InputInterface, TailwindOutputInterface>[] = [
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=2, scenario=single-hex] no throw');
          assert.ok(output !== undefined, '[cell=2, scenario=single-hex] output present');
          assert.ok(typeof output.colors === 'object', '[cell=2, scenario=single-hex] colors is object');
          assert.ok(typeof output.cssVars === 'string', '[cell=2, scenario=single-hex] cssVars is string');
          assert.ok(typeof output.config === 'string', '[cell=2, scenario=single-hex] config is string');
          assert.ok(output.config.includes('export default'), '[cell=2, scenario=single-hex] config is a JS module');
          assert.ok(output.config.includes('theme'), '[cell=2, scenario=single-hex] config contains theme key');
          assert.ok(output.config.includes('colors'), '[cell=2, scenario=single-hex] config contains colors key');
        },
        'input': {
          'colors': ['#8b5cf6'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['accent'])
        },
        'name': 'single hex color with one role produces all three output fields'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=2, scenario=multi-role] no throw');
          assert.ok(output?.colors.critical !== undefined, '[cell=2, scenario=multi-role] critical key present');
          assert.ok(output?.colors.link !== undefined, '[cell=2, scenario=multi-role] link key present');
          assert.ok(output?.colors.positive !== undefined, '[cell=2, scenario=multi-role] positive key present');
          assert.strictEqual(Object.keys(output?.colors ?? {}).length, 3,
            '[cell=2, scenario=multi-role] exactly 3 color keys');
        },
        'input': {
          'colors': ['#ef4444', '#3b82f6', '#22c55e'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['critical', 'link', 'positive'])
        },
        'name': 'multiple hex colors with multiple roles produce correctly shaped output'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=2, scenario=oklch-shape] no throw');
          assert.ok(typeof output?.colors === 'object', '[cell=2, scenario=oklch-shape] colors is object');
          assert.ok(typeof output?.cssVars === 'string', '[cell=2, scenario=oklch-shape] cssVars is string');
          assert.ok(typeof output?.config === 'string', '[cell=2, scenario=oklch-shape] config is string');
        },
        'input': {
          'colors': [{ 'c': 0.15, 'h': 250, 'l': 0.55 }],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['brand'])
        },
        'name': 'oklch input produces config output with the same field structure'
      }
    ];

    new ScenarioRunner<TailwindPluginScenarioEntity.InputInterface, TailwindOutputInterface>(
      'TailwindPlugin :: cell-2 :: theme-config-shape',
      (input) => {
        const engine = TailwindPluginScenarioEntity.Factory.createEngine();
        const firstColor = input.colors.at(0);
        const intakeTask = typeof firstColor === 'string' ? 'intake:hex' : 'intake:oklch';
        engine.pipeline([intakeTask, 'resolve:roles', 'emit:tailwindTheme']);
        const state = engine.run(TailwindPluginScenarioEntity.Factory.createInput(input));
        const result = TailwindPluginScenarioEntity.Factory.outputFrom(state);
        return result;
      }
    ).run(scenarios);
  }
}
