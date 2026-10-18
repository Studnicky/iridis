import type { TailwindOutputInterface } from '@studnicky/iridis-tailwind';

import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { TailwindPluginScenarioEntity } from './entities/TailwindPluginScenarioEntity.ts';

/** E2E cell 4: wide-gamut CSS support gating. */
export class TailwindSupportsGatingScenarioSuite {
  static run(): void {
    const scenarios: readonly ScenarioInterface<TailwindPluginScenarioEntity.InputInterface, TailwindOutputInterface>[] = [
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=4, scenario=srgb-no-supports] no throw');
          assert.ok(output !== undefined, '[cell=4, scenario=srgb-no-supports] output present');
          assert.ok(!output.cssVars.includes('@supports'), '[cell=4, scenario=srgb-no-supports] no @supports block');
          assert.ok(!output.cssVars.includes('display-p3'), '[cell=4, scenario=srgb-no-supports] no display-p3 syntax');
        },
        'input': {
          'colors': ['#8b5cf6'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['accent'])
        },
        'name': 'sRGB hex input produces cssVars without @supports block'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=4, scenario=srgb-root-block] no throw');
          assert.ok(output !== undefined, '[cell=4, scenario=srgb-root-block] output present');
          assert.ok(output.cssVars.includes(':root'), '[cell=4, scenario=srgb-root-block] :root block present');
          assert.ok(output.cssVars.includes('--c-link:'), '[cell=4, scenario=srgb-root-block] --c-link declaration present');
        },
        'input': {
          'colors': ['#3b82f6'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['link'])
        },
        'name': 'sRGB hex input cssVars still contains unconditional :root block'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=4, scenario=p3-supports] no throw');
          assert.ok(output !== undefined, '[cell=4, scenario=p3-supports] output present');
          const cssVars = output.cssVars;
          assert.ok(cssVars.includes('@supports (color: color(display-p3 0 0 0))'),
            '[cell=4, scenario=p3-supports] @supports detection query present');
          assert.ok(cssVars.includes('color(display-p3 '), '[cell=4, scenario=p3-supports] display-p3 declaration present');
          const rootIndex = cssVars.indexOf(':root');
          const supportsIndex = cssVars.indexOf('@supports');
          assert.ok(rootIndex >= 0 && supportsIndex >= 0, '[cell=4, scenario=p3-supports] both blocks present');
          assert.ok(rootIndex < supportsIndex, '[cell=4, scenario=p3-supports] :root precedes @supports');
        },
        'input': {
          'colors': [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(
            ['accent'],
            { 'chromaRange': [0, 0.5], 'lightnessRange': [0.05, 0.95] }
          )
        },
        'name': 'out-of-sRGB OKLCH input adds @supports block after :root'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=4, scenario=ingamut-oklch] no throw');
          assert.ok(output !== undefined, '[cell=4, scenario=ingamut-oklch] output present');
          assert.ok(!output.cssVars.includes('display-p3'), '[cell=4, scenario=ingamut-oklch] no display-p3');
        },
        'input': {
          'colors': [{ 'c': 0.05, 'h': 270, 'l': 0.5 }],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['muted'])
        },
        'name': 'in-gamut OKLCH input produces no @supports block'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=4, scenario=multi-srgb-no-supports] no throw');
          assert.ok(output !== undefined, '[cell=4, scenario=multi-srgb-no-supports] output present');
          assert.ok(!output.cssVars.includes('@supports'), '[cell=4, scenario=multi-srgb-no-supports] no @supports');
        },
        'input': {
          'colors': ['#ef4444', '#22c55e', '#3b82f6'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['critical', 'positive', 'link'])
        },
        'name': '@supports block omitted when multiple sRGB roles share a palette'
      }
    ];

    new ScenarioRunner<TailwindPluginScenarioEntity.InputInterface, TailwindOutputInterface>(
      'TailwindPlugin :: cell-4 :: supports-gating',
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
