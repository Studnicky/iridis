import type { JSONSchema7Type } from 'json-schema';

import { InputInterfaceTypeEntity } from '@studnicky/iridis';
import { galleryRoleSchema5, imagePlugin, ImagePlugin } from '@studnicky/iridis-image';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GalleryCandidateOutputEntity } from '../../src/entities/GalleryCandidateOutputEntity.ts';

class ImagePluginFixture {
  static engine(): Engine {
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks.at(index);
      if (task !== undefined) {engine.tasks.register(task);}
    }
    engine.adopt(imagePlugin);
    return engine;
  }

  static input(colors: string[], gallery: Record<string, JSONSchema7Type>) {
    const result = InputInterfaceTypeEntity.create({ 'colors': colors, 'metadata': { 'gallery': gallery } });
    return result;
  }
}

await test('ImagePlugin exposes the complete gallery task contract', () => {
  assert.ok(imagePlugin instanceof ImagePlugin);
  const names = imagePlugin.tasks().map((task) => {
    const result = task.name;
    return result;
  }).sort((left, right) => {
    const result = left.localeCompare(right);
    return result;
  });
  assert.deepStrictEqual(names, ['gallery:assignRoles', 'gallery:extract', 'gallery:extractCandidates', 'gallery:harmonize', 'gallery:histogram']);
  assert.strictEqual(galleryRoleSchema5.roles.length, 5);
});

await test('ImagePlugin extracts resolved candidate palettes through canonical input intake', () => {
  const engine = ImagePluginFixture.engine();
  engine.pipeline(['intake:hex', 'gallery:extractCandidates']);
  const state = engine.run(ImagePluginFixture.input(
    ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
    { 'candidates': [
      { 'algorithm': 'median-cut', 'k': 2, 'label': 'compact' },
      { 'algorithm': 'wu-quantize', 'k': 4, 'label': 'wide' }
    ] }
  ));
  const candidates = state.metadata['gallery:candidates'];
  assert.ok(Array.isArray(candidates));
  assert.strictEqual(candidates.length, 2);
  const compact = candidates.at(0);
  assert.ok(compact !== undefined && compact !== null && !Array.isArray(compact) && typeof compact === 'object');
  assert.ok(GalleryCandidateOutputEntity.validate(compact));
  assert.strictEqual(compact.algorithm, 'median-cut');
  assert.strictEqual(Object.hasOwn(compact, 'strategy'), false);
});

await test('ImagePlugin assigns gallery roles from a canonical palette input', () => {
  const engine = ImagePluginFixture.engine();
  engine.pipeline(['intake:hex', 'gallery:extract', 'gallery:assignRoles']);
  const state = engine.run(ImagePluginFixture.input(
    ['#0d0d0d', '#202020', '#3c3c3c', '#8b5cf6', '#a78bfa', '#5b6470', '#7d8390'],
    { 'k': 5 }
  ));
  assert.ok('canvas' in state.roles);
  assert.ok('frame' in state.roles);
  assert.ok('accent' in state.roles);
  assert.ok('muted' in state.roles);
  assert.ok('text' in state.roles);
});

await test('ImagePlugin honors a zero harmonization threshold through canonical input intake', () => {
  const engine = ImagePluginFixture.engine();
  engine.pipeline(['intake:hex', 'gallery:extract', 'gallery:assignRoles', 'gallery:harmonize']);
  const state = engine.run(ImagePluginFixture.input(
    ['#0d0d0d', '#6d28d9', '#7c3aed', '#a78bfa', '#c4b5fd'],
    { 'harmonizeThreshold': 0, 'k': 5 }
  ));
  assert.strictEqual(state.metadata['gallery:harmonized'], false);
});
