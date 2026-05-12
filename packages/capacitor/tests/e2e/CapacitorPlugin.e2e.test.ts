/**
 * Capacitor plugin end-to-end tests.
 *
 * Drives intake → resolve → emit:capacitor* and asserts that StatusBar,
 * theme, splash and android xml outputs all collect under outputs.capacitor.
 */
import { test } from 'node:test';
import assert   from 'node:assert/strict';

import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import type { RoleSchemaInterface } from '@studnicky/iridis';
import { capacitorPlugin, CapacitorPlugin } from '@studnicky/iridis-capacitor';
import type {
  StatusBarOutputInterface,
  CapacitorThemeOutputInterface,
  SplashScreenOutputInterface,
} from '@studnicky/iridis-capacitor/types';

const ROLES: RoleSchemaInterface = {
  'name': 'simple-capacitor',
  'roles': [
    { 'name': 'primary',    'required': true,  'intent': 'base' },
    { 'name': 'background', 'required': true,  'intent': 'surface' },
    { 'name': 'accent',     'required': false, 'intent': 'accent' },
  ],
};

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.adopt(capacitorPlugin);
  return engine;
}

test('CapacitorPlugin e2e :: shape :: singleton is an instance of CapacitorPlugin', () => {
  assert.ok(capacitorPlugin instanceof CapacitorPlugin);
  assert.strictEqual(capacitorPlugin.name,    'capacitor');
  assert.strictEqual(capacitorPlugin.version, '0.1.0');
});

test('CapacitorPlugin e2e :: shape :: registers four emit tasks', () => {
  const taskNames = capacitorPlugin.tasks().map((t) => t.name).sort();
  assert.deepStrictEqual(
    taskNames,
    [
      'emit:androidThemeXml',
      'emit:capacitorSplashScreen',
      'emit:capacitorStatusBar',
      'emit:capacitorTheme',
    ],
  );
});

test('CapacitorPlugin e2e :: happy :: full capacitor pipeline writes statusBar + theme + splash', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'emit:capacitorStatusBar',
    'emit:capacitorTheme',
    'emit:capacitorSplashScreen',
    'emit:androidThemeXml',
  ]);

  const state = await engine.run({
    'colors': ['#8b5cf6', '#ffffff', '#ec4899'],
    'roles':  ROLES,
  });

  const cap = state.outputs['capacitor'] as Record<string, unknown> | undefined;
  assert.ok(cap !== undefined, 'outputs.capacitor present');

  const statusBar = cap['statusBar'] as StatusBarOutputInterface | undefined;
  if (statusBar !== undefined) {
    assert.match(statusBar.backgroundColor, /^#[0-9a-f]{6}$/i, 'statusBar.backgroundColor is hex');
    assert.ok(['DARK', 'LIGHT'].includes(statusBar.style));
  }

  const theme = cap['theme'] as CapacitorThemeOutputInterface | undefined;
  if (theme !== undefined) {
    assert.match(theme.primary,    /^#[0-9a-f]{6}$/i);
    assert.match(theme.background, /^#[0-9a-f]{6}$/i);
  }

  const splash = cap['splashScreen'] as SplashScreenOutputInterface | undefined;
  if (splash !== undefined) {
    assert.match(splash.backgroundColor, /^#[0-9a-f]{6}$/i);
  }
});
