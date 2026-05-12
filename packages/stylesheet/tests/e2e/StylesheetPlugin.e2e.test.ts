/**
 * Stylesheet plugin end-to-end tests.
 *
 * Drives intake → resolve → emit:cssVars and asserts the plugin writes a
 * CssVarsOutputInterface to state.outputs.cssVars containing :root rules.
 */
import { test } from 'node:test';
import assert   from 'node:assert/strict';

import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import type { RoleSchemaInterface } from '@studnicky/iridis';
import { stylesheetPlugin, StylesheetPlugin } from '@studnicky/iridis-stylesheet';
import type { CssVarsOutputInterface } from '@studnicky/iridis-stylesheet/types';

const ROLES: RoleSchemaInterface = {
  'name': 'simple',
  'roles': [
    { 'name': 'primary',   'required': true },
    { 'name': 'secondary', 'required': false },
  ],
};

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.adopt(stylesheetPlugin);
  return engine;
}

test('StylesheetPlugin e2e :: shape :: singleton is an instance of StylesheetPlugin', () => {
  assert.ok(stylesheetPlugin instanceof StylesheetPlugin);
  assert.strictEqual(stylesheetPlugin.name,    'stylesheet');
  assert.strictEqual(stylesheetPlugin.version, '0.1.0');
});

test('StylesheetPlugin e2e :: shape :: registers emit:cssVars and emit:cssVarsScoped', () => {
  const taskNames = stylesheetPlugin.tasks().map((t) => t.name).sort();
  assert.deepStrictEqual(taskNames, ['emit:cssVars', 'emit:cssVarsScoped']);
});

test('StylesheetPlugin e2e :: happy :: emit:cssVars writes a :root block to outputs.cssVars', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'derive:variant',
    'emit:cssVars',
  ]);

  const state = await engine.run({
    'colors': ['#5b21b6', '#c4b5fd'],
    'roles':  ROLES,
  });

  const out = state.outputs['cssVars'] as CssVarsOutputInterface | undefined;
  assert.ok(out !== undefined,                 'outputs.cssVars present');
  assert.ok(out.full.includes(':root'),        'full block contains :root');
  assert.ok(typeof out.map === 'object',       'map is an object');
  assert.ok(Object.keys(out.map).length >= 1,  'map has at least one entry');
});
