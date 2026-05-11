/**
 * Tailwind plugin end-to-end tests.
 *
 * Drives intake → resolve → emit:tailwindTheme and asserts the plugin writes
 * a TailwindOutputInterface to state.outputs.tailwind containing a colors map.
 */
import { test } from 'node:test';
import assert   from 'node:assert/strict';

import { Engine }       from '@studnicky/iridis/engine';
import { mathBuiltins } from '@studnicky/iridis/math';
import { coreTasks }    from '@studnicky/iridis/tasks';
import type { RoleSchemaInterface } from '@studnicky/iridis';
import { tailwindPlugin, TailwindPlugin } from '@studnicky/iridis-tailwind';
import type { TailwindOutputInterface }   from '@studnicky/iridis-tailwind/types';

const ROLES: RoleSchemaInterface = {
  'name': 'simple',
  'roles': [
    { 'name': 'accent', 'required': true },
  ],
};

function freshEngine(): Engine {
  const engine = new Engine();
  for (const m of mathBuiltins) engine.math.register(m);
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.adopt(tailwindPlugin);
  return engine;
}

test('TailwindPlugin e2e :: shape :: singleton is an instance of TailwindPlugin', () => {
  assert.ok(tailwindPlugin instanceof TailwindPlugin);
  assert.strictEqual(tailwindPlugin.name,    'tailwind');
  assert.strictEqual(tailwindPlugin.version, '0.1.0');
});

test('TailwindPlugin e2e :: shape :: registers emit:tailwindTheme', () => {
  const taskNames = tailwindPlugin.tasks().map((t) => t.name);
  assert.deepStrictEqual(taskNames, ['emit:tailwindTheme']);
});

test('TailwindPlugin e2e :: happy :: emit:tailwindTheme writes colors + cssVars + config', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'emit:tailwindTheme',
  ]);

  const state = await engine.run({
    'colors': ['#8b5cf6'],
    'roles':  ROLES,
  });

  const out = state.outputs['tailwind'] as TailwindOutputInterface | undefined;
  assert.ok(out !== undefined,                 'outputs.tailwind present');
  assert.ok(typeof out.colors  === 'object',   'colors is an object');
  assert.ok(typeof out.cssVars === 'string',   'cssVars is a string');
  assert.ok(typeof out.config  === 'string',   'config is a string');
});
