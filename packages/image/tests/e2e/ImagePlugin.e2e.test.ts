/**
 * Image plugin end-to-end tests.
 *
 * Asserts plugin shape and drives the gallery extract/assignRoles/harmonize
 * trio against the published 5-role gallery schema.
 */
import { test } from 'node:test';
import assert   from 'node:assert/strict';

import { Engine }       from '@studnicky/iridis/engine';
import { mathBuiltins } from '@studnicky/iridis/math';
import { coreTasks }    from '@studnicky/iridis/tasks';
import { imagePlugin, ImagePlugin, galleryRoleSchema5 } from '@studnicky/iridis-image';

function freshEngine(): Engine {
  const engine = new Engine();
  for (const m of mathBuiltins) engine.math.register(m);
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.adopt(imagePlugin);
  return engine;
}

test('ImagePlugin e2e :: shape :: singleton is an instance of ImagePlugin', () => {
  assert.ok(imagePlugin instanceof ImagePlugin);
  assert.strictEqual(imagePlugin.name,    'image');
  assert.strictEqual(imagePlugin.version, '0.1.0');
});

test('ImagePlugin e2e :: shape :: registers the three gallery tasks', () => {
  const taskNames = imagePlugin.tasks().map((t) => t.name).sort();
  assert.deepStrictEqual(
    taskNames,
    ['gallery:assignRoles', 'gallery:extract', 'gallery:harmonize'],
  );
});

test('ImagePlugin e2e :: happy :: gallery:extract reduces a hex set via median-cut', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'gallery:extract',
  ]);

  // Provide more colors than k=5 so extract has work to do.
  const state = await engine.run({
    'colors': [
      '#1a1a1a', '#2b2b2b', '#3c3c3c', '#4d4d4d', '#5e5e5e',
      '#8b5cf6', '#a78bfa', '#c4b5fd', '#d8b4fe', '#e9d5ff',
      '#ec4899', '#f472b6', '#f9a8d4',
    ],
    'metadata': { 'gallery': { 'k': 5 } },
  });

  assert.ok(state.colors.length <= 5, `extract clamps to k=5, got ${state.colors.length}`);
  const dominant = (state.metadata['gallery'] as { 'dominantColors'?: readonly unknown[] } | undefined)?.dominantColors;
  assert.ok(Array.isArray(dominant), 'dominantColors recorded in metadata');
});

test('ImagePlugin e2e :: shape :: galleryRoleSchema5 exposes five roles', () => {
  assert.strictEqual(galleryRoleSchema5.roles.length, 5);
});
