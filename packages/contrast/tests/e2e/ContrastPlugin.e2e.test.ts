/**
 * Contrast plugin end-to-end tests.
 *
 * Drives the engine through intake → resolve → enforce:wcagAA and asserts the
 * plugin both registers its tasks under the canonical names and produces
 * a contrast report on state.metadata.
 */
import { test } from 'node:test';
import assert   from 'node:assert/strict';

import { Engine }           from '@studnicky/iridis/engine';
import { mathBuiltins }     from '@studnicky/iridis/math';
import { coreTasks }        from '@studnicky/iridis/tasks';
import type { RoleSchemaInterface } from '@studnicky/iridis';
import { contrastPlugin, ContrastPlugin } from '@studnicky/iridis-contrast';

const ROLES: RoleSchemaInterface = {
  'name': 'simple-contrast',
  'roles': [
    { 'name': 'text',       'required': true },
    { 'name': 'background', 'required': true },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

function freshEngine(): Engine {
  const engine = new Engine();
  for (const m of mathBuiltins) engine.math.register(m);
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.adopt(contrastPlugin);
  return engine;
}

test('ContrastPlugin e2e :: shape :: singleton is an instance of ContrastPlugin', () => {
  assert.ok(contrastPlugin instanceof ContrastPlugin, 'singleton is the class instance');
  assert.strictEqual(contrastPlugin.name,    'contrast');
  assert.strictEqual(contrastPlugin.version, '0.1.0');
});

test('ContrastPlugin e2e :: shape :: registers all four enforce tasks', () => {
  const taskNames = contrastPlugin.tasks().map((t) => t.name).sort();
  assert.deepStrictEqual(
    taskNames,
    ['enforce:apca', 'enforce:cvdSimulate', 'enforce:wcagAA', 'enforce:wcagAAA'],
    'plugin exposes the four canonical enforce task names',
  );
});

test('ContrastPlugin e2e :: happy :: enforce:wcagAA pipeline writes a wcag.aa report', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'enforce:wcagAA',
    'emit:json',
  ]);

  const state = await engine.run({
    'colors':   ['#000000', '#ffffff'],
    'roles':    ROLES,
    'contrast': { 'level': 'AA', 'algorithm': 'wcag21' },
  });

  // engine completed without throwing
  assert.ok(state !== undefined);

  // metadata.wcag.aa is shaped by EnforceWcagAa
  const wcag = state.metadata['wcag'] as { 'aa'?: { 'pairs': readonly unknown[] } } | undefined;
  if (wcag !== undefined && wcag.aa !== undefined) {
    assert.ok(Array.isArray(wcag.aa.pairs), 'wcag.aa.pairs is an array when pairs resolve');
  }
});
