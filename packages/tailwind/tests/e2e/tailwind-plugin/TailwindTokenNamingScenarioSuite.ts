import type { TailwindOutputInterface } from '@studnicky/iridis-tailwind';

import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { TailwindPluginScenarioEntity } from './entities/TailwindPluginScenarioEntity.ts';

/** E2E cell 3: Tailwind color-token and shade-scale naming. */
export class TailwindTokenNamingScenarioSuite {
  private static isLowercaseHex(value: string): boolean {
    if (value.length !== 7 || !value.startsWith('#')) {
      return false;
    }
    const hexadecimalCharacters = '0123456789abcdef';
    for (let index = 1; index < value.length; index += 1) {
      const character = value.at(index);
      if (character === undefined || !hexadecimalCharacters.includes(character)) {
        return false;
      }
    }
    return true;
  }

  static run(): void {
    const scenarios: readonly ScenarioInterface<TailwindPluginScenarioEntity.InputInterface, TailwindOutputInterface>[] = [
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=3, scenario=flat-role] no throw');
          const accent = output?.colors.accent;
          assert.ok(typeof accent === 'string', '[cell=3, scenario=flat-role] colors.accent is string');
          assert.ok(TailwindTokenNamingScenarioSuite.isLowercaseHex(accent),
            '[cell=3, scenario=flat-role] colors.accent is 6-digit lowercase hex');
        },
        'input': {
          'colors': ['#8b5cf6'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['accent'])
        },
        'name': 'flat role produces string hex value in colors map'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=3, scenario=shade-group] no throw');
          const gray = output?.colors.gray;
          assert.ok(gray !== undefined, '[cell=3, scenario=shade-group] gray root key present');
          assert.ok(typeof gray === 'object', '[cell=3, scenario=shade-group] gray is a shade object');
          assert.ok(typeof gray['500'] === 'string', '[cell=3, scenario=shade-group] gray.500 is string');
          assert.ok(typeof gray['900'] === 'string', '[cell=3, scenario=shade-group] gray.900 is string');
          assert.strictEqual(output?.colors['gray-500'], undefined, '[cell=3, scenario=shade-group] flat gray-500 absent');
          assert.strictEqual(output?.colors['gray-900'], undefined, '[cell=3, scenario=shade-group] flat gray-900 absent');
        },
        'input': {
          'colors': ['#6b7280', '#111827'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['gray-500', 'gray-900'])
        },
        'name': 'two shade-scale members group under root key'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=3, scenario=single-shade] no throw');
          assert.strictEqual(typeof output?.colors['brand-500'], 'string',
            '[cell=3, scenario=single-shade] brand-500 remains flat string');
          assert.strictEqual(output?.colors.brand, undefined, '[cell=3, scenario=single-shade] brand root key absent');
        },
        'input': {
          'colors': ['#3b82f6'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['brand-500'])
        },
        'name': 'single shade-scale member stays flat (no nested object)'
      },
      {
        'assert': ({ 'error': error, 'output': output }) => {
          assert.strictEqual(error, undefined, '[cell=3, scenario=hex-format] no throw');
          const colorEntries = Object.entries(output?.colors ?? {});
          for (let index = 0; index < colorEntries.length; index += 1) {
            const [key, value] = colorEntries[index]!;
            if (typeof value === 'string') {
              assert.ok(TailwindTokenNamingScenarioSuite.isLowercaseHex(value),
                `[cell=3, scenario=hex-format] colors.${key} is 6-digit lowercase hex`);
            } else {
              const shadeEntries = Object.entries(value);
              for (let shadeIndex = 0; shadeIndex < shadeEntries.length; shadeIndex += 1) {
                const [shade, hex] = shadeEntries[shadeIndex]!;
                assert.ok(TailwindTokenNamingScenarioSuite.isLowercaseHex(hex),
                  `[cell=3, scenario=hex-format] colors.${key}.${shade} is 6-digit lowercase hex`);
              }
            }
          }
        },
        'input': {
          'colors': ['#ff0000', '#00ff00', '#0000ff'],
          'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['primary', 'secondary', 'muted'])
        },
        'name': 'all values in flat role map are 6-digit lowercase hex'
      }
    ];

    new ScenarioRunner<TailwindPluginScenarioEntity.InputInterface, TailwindOutputInterface>(
      'TailwindPlugin :: cell-3 :: color-token-naming',
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
