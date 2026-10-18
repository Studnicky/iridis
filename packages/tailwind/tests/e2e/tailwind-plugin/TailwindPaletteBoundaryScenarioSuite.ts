import type { TailwindOutputInterface } from '@studnicky/iridis-tailwind';

import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { TailwindPluginScenarioEntity } from './entities/TailwindPluginScenarioEntity.ts';

/** E2E cell 6: empty, minimal, complete, and synthesized palettes. */
export class TailwindPaletteBoundaryScenarioSuite {
  static run(): void {
    const scenarios: readonly ScenarioInterface<TailwindPluginScenarioEntity.InputInterface, TailwindOutputInterface>[] = [
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=6, scenario=empty-palette] no throw');
          assert.ok(output !== undefined, '[cell=6, scenario=empty-palette] output present');
          assert.strictEqual(Object.keys(output.colors).length, 0, '[cell=6, scenario=empty-palette] colors map empty');
          assert.ok(output.cssVars.includes(':root'), '[cell=6, scenario=empty-palette] :root block present');
          assert.ok(!output.cssVars.includes('@supports'), '[cell=6, scenario=empty-palette] no @supports block');
        },
        'input': { 'colors': [] },
        'name': 'empty palette (no colors, no roles) produces empty colors map and minimal cssVars'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=6, scenario=single-color] no throw');
          assert.ok(output !== undefined, '[cell=6, scenario=single-color] output present');
          assert.strictEqual(Object.keys(output.colors).length, 1, '[cell=6, scenario=single-color] exactly one color key');
          assert.ok(Object.hasOwn(output.colors, 'accent'), '[cell=6, scenario=single-color] accent key present');
        },
        'input': {
          'colors': ['#8b5cf6'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['accent'])
        },
        'name': 'single color with one role produces exactly one key in colors map'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=6, scenario=full-palette] no throw');
          assert.ok(output !== undefined, '[cell=6, scenario=full-palette] output present');
          assert.strictEqual(Object.keys(output.colors).length, 5, '[cell=6, scenario=full-palette] all five role keys present');
          const expectedRoles = ['critical', 'warning', 'positive', 'link', 'accent'];
          for (let index = 0; index < expectedRoles.length; index += 1) {
            const role = expectedRoles[index];
            if (role !== undefined) {
              assert.ok(Object.hasOwn(output.colors, role), `[cell=6, scenario=full-palette] ${role} key present`);
            }
          }
        },
        'input': {
          'colors': ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['critical', 'warning', 'positive', 'link', 'accent'])
        },
        'name': 'full palette with five roles produces all five keys in colors map'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=6, scenario=no-colors-with-roles] no throw');
          assert.ok(output !== undefined, '[cell=6, scenario=no-colors-with-roles] output present');
          assert.strictEqual(Object.keys(output.colors).length, 1,
            '[cell=6, scenario=no-colors-with-roles] synthesized role appears in colors map');
          assert.ok(Object.hasOwn(output.colors, 'accent'), '[cell=6, scenario=no-colors-with-roles] synthesized accent key present');
        },
        'input': {
          'colors': [],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['accent'])
        },
        'name': 'no input colors with required roles schema synthesizes role from constraints'
      }
    ];

    new ScenarioRunner<TailwindPluginScenarioEntity.InputInterface, TailwindOutputInterface>(
      'TailwindPlugin :: cell-6 :: palette-boundary',
      (input) => {
        const engine = TailwindPluginScenarioEntity.Factory.createEngine();
        const pipeline = input.roles === undefined
          ? ['intake:hex', 'emit:tailwindTheme']
          : ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'];
        engine.pipeline(pipeline);
        const state = engine.run(TailwindPluginScenarioEntity.Factory.createInput(input));
        const result = TailwindPluginScenarioEntity.Factory.outputFrom(state);
        return result;
      }
    ).run(scenarios);
  }
}
