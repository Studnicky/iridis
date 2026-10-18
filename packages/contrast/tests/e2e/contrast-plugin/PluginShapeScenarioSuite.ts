import { ContrastPlugin, contrastPlugin } from '@studnicky/iridis-contrast';
import { Validator } from '@studnicky/iridis/model';
import { JsonValue } from '@studnicky/types/node';
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
    await test('ContrastPlugin :: cell-1 :: plugin.schema :: CVD metadata requires its canonical result fields', () => {
      const metadata = contrastPlugin.schemas().metadata;
      assert.ok(metadata !== undefined, 'plugin contributes metadata schemas');
      const cvdSchema = metadata['contrast:cvd'];
      assert.ok(cvdSchema !== undefined, 'plugin contributes CVD metadata schema');
      const validator = new Validator();
      if (!JsonValue.is(cvdSchema)) {
        assert.fail('plugin contributes a JSON CVD metadata schema');
      }
      if (!validator.tryCompile(cvdSchema)) {
        assert.fail('plugin contributes a compilable CVD metadata schema');
      }
      assert.equal(validator.validate(cvdSchema, { 'corrections': [], 'warnings': [] }).errors.length, 0, 'canonical CVD result passes plugin schema');
      assert.ok(validator.validate(cvdSchema, { 'corrections': [] }).errors.length > 0, 'warnings remains required at the plugin boundary');
      assert.ok(validator.validate(cvdSchema, { 'warnings': [] }).errors.length > 0, 'corrections remains required at the plugin boundary');
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
