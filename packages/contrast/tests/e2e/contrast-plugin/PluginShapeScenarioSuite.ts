import { ContrastPlugin, contrastPlugin } from '@studnicky/iridis-contrast';
import assert from 'node:assert/strict';
import { test } from 'node:test';

/** Behavioral contract for the public Contrast plugin shape. */
export class PluginShapeScenarioSuite {
  static async run(): Promise<void> {
    await test('ContrastPlugin :: cell-1 :: plugin.shape :: singleton identity', () => {
      assert.ok(contrastPlugin instanceof ContrastPlugin);
      assert.strictEqual(contrastPlugin.name, 'contrast');
      assert.strictEqual(contrastPlugin.version, '0.1.0');
    });
    await test('ContrastPlugin :: cell-1 :: plugin.shape :: task names', () => {
      const names = contrastPlugin.tasks().map((task) => {
        const result = task.name;
        return result;
      }).sort((left, right) => {
        const result = left.localeCompare(right);
        return result;
      });
      assert.deepStrictEqual(names, ['enforce:apca', 'enforce:cvdSimulate', 'enforce:wcagAA', 'enforce:wcagAAA']);
    });
    await test('ContrastPlugin :: cell-1 :: plugin.shape :: task calls are stable', () => {
      const initial = contrastPlugin.tasks().map((task) => {
        const result = task.name;
        return result;
      });
      const subsequent = contrastPlugin.tasks().map((task) => {
        const result = task.name;
        return result;
      });
      assert.deepStrictEqual(subsequent, initial);
    });
  }
}
