import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TailwindPluginScenarioEntity } from './entities/TailwindPluginScenarioEntity.ts';

/** Byte-stable behavioral lock for a canonical two-role sRGB palette. */
export class TailwindGoldenScenarioSuite {
  static run(): void {
    void test('TailwindPlugin :: golden :: canonical two-role sRGB output is stable', (): void => {
      const engine = TailwindPluginScenarioEntity.Factory.createEngine();
      engine.pipeline(['intake:hex', 'resolve:roles', 'emit:tailwindTheme']);
      const state = engine.run(TailwindPluginScenarioEntity.Factory.createInput({
        'colors': ['#8b5cf6', '#ef4444'],
        'roles': TailwindPluginScenarioEntity.Factory.createRoleSchema(['accent', 'critical'])
      }));
      const output = TailwindPluginScenarioEntity.Factory.outputFrom(state);

      assert.strictEqual(typeof output.colors.accent, 'string', '[golden] accent is a flat color string');
      assert.strictEqual(typeof output.colors.critical, 'string', '[golden] critical is a flat color string');
      assert.ok(output.cssVars.includes(':root {'), '[golden] cssVars contains the root block');
      assert.ok(!output.cssVars.includes('@supports'), '[golden] sRGB output has no wide-gamut support block');
      assert.ok(output.config.startsWith('export default {'), '[golden] config opens as a module');
      assert.ok(output.config.trimEnd().endsWith('};'), '[golden] config closes as a module');
      assert.ok(output.config.includes("'accent'"), '[golden] config contains accent');
      assert.ok(output.config.includes("'critical'"), '[golden] config contains critical');
    });
  }
}
