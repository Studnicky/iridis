import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Engine } from '../../src/engine/Engine.ts';
import { InputEntity } from '../../src/entities/InputEntity.ts';
import { RoleSchemaEntity } from '../../src/entities/RoleSchemaEntity.ts';
import { rgbToOklch } from '../../src/math/RgbToOklch.ts';
import { coreTasks } from '../../src/tasks/index.ts';

class EngineSyncHueScaleFixture {
  static engineFor(pipeline: readonly string[]): Engine {
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.pipeline([...pipeline]);
    return engine;
  }


  static schema(): RoleSchemaEntity.Type {
    const result = RoleSchemaEntity.intake({
      'name': 'relationship-hue-target',
      'relationshipGraph': {
        'groups': [{
          'anchor': 'brand',
          'defaultMode': 'default',
          'id': 'semantic',
          'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'default' }],
          'name': 'Semantic',
          'relationships': [
            { 'clamp': 40, 'hue': 150, 'id': 'success-hue', 'operation': 'hue-target', 'priority': 1, 'relaxability': 'fixed', 'source': 'brand', 'target': 'success' },
            { 'clamp': 20, 'hue': 300, 'id': 'error-hue', 'operation': 'hue-target', 'priority': 2, 'relaxability': 'fixed', 'target': 'error' }
          ]
        }]
      },
      'roles': [
        { 'chromaRange': [0.12, 0.30], 'intent': 'accent', 'lightnessRange': [0.55, 0.78], 'name': 'brand', 'required': true },
        { 'chromaRange': [0.16, 0.28], 'intent': 'positive', 'lightnessRange': [0.55, 0.70], 'name': 'success' },
        { 'chromaRange': [0.16, 0.28], 'intent': 'critical', 'lightnessRange': [0.55, 0.70], 'name': 'error' }
      ]
    });
    return result;
  }
}

void test('Engine.run remains synchronous with relationship resolution', () => {
  const engine = EngineSyncHueScaleFixture.engineFor(['intake:hex', 'resolve:roles', 'derive:roleRelations']);
  const state = engine.run(InputEntity.intake({ 'colors': ['#7c3aed'], 'roles': EngineSyncHueScaleFixture.schema() }));
  assert.ok(!(state instanceof Promise));
  assert.equal(typeof state.roles.brand?.hex, 'string');
});

void test('hue-target bounds both source-derived and target-own hue nudges', () => {
  const engine = EngineSyncHueScaleFixture.engineFor(['intake:hex', 'resolve:roles', 'derive:roleRelations']);
  const state = engine.run(InputEntity.intake({ 'colors': ['#b11e12'], 'roles': EngineSyncHueScaleFixture.schema() }));
  const brand = state.roles.brand;
  const success = state.roles.success;
  const error = state.roles.error;
  assert.ok(brand !== undefined && success !== undefined && error !== undefined);
  const brandHue = rgbToOklch.apply(
    parseInt(brand.hex.slice(1, 3), 16) / 255,
    parseInt(brand.hex.slice(3, 5), 16) / 255,
    parseInt(brand.hex.slice(5, 7), 16) / 255
  ).oklch.h;
  const successHue = rgbToOklch.apply(
    parseInt(success.hex.slice(1, 3), 16) / 255,
    parseInt(success.hex.slice(3, 5), 16) / 255,
    parseInt(success.hex.slice(5, 7), 16) / 255
  ).oklch.h;
  const errorHue = rgbToOklch.apply(
    parseInt(error.hex.slice(1, 3), 16) / 255,
    parseInt(error.hex.slice(3, 5), 16) / 255,
    parseInt(error.hex.slice(5, 7), 16) / 255
  ).oklch.h;
  const successDelta = Math.abs(((successHue - brandHue + 540) % 360) - 180);
  const errorDelta = Math.abs(((errorHue - brandHue + 540) % 360) - 180);
  assert.ok(successDelta <= 45);
  assert.ok(errorDelta <= 25);
});

void test('lightness-target variants resolve tonal steps after relationship derivation', () => {
  const engine = EngineSyncHueScaleFixture.engineFor([
    'intake:hex',
    'resolve:roles',
    'derive:roleRelations',
    'derive:variant'
  ]);
  const state = engine.run(InputEntity.intake({
    'colors': ['#7c3aed'],
    'metadata': {
      'core:variantConfig': [
        { 'invertLightness': false, 'lightnessTarget': 0.95, 'name': 's100' },
        { 'invertLightness': false, 'lightnessTarget': 0.30, 'name': 's900' }
      ]
    },
    'roles': EngineSyncHueScaleFixture.schema()
  }));
  const light = state.variants.s100?.brand;
  const dark = state.variants.s900?.brand;
  assert.ok(light !== undefined && dark !== undefined);
  assert.ok(light.oklch.l > dark.oklch.l);
});
