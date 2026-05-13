/**
 * Capacitor plugin end-to-end tests.
 *
 * Drives intake → resolve → all four Capacitor emit tasks through one
 * shared engine via a single scenario table. The happy-path scenario
 * runs the pipeline once and asserts EVERY output slot (statusBar,
 * theme, splashScreen, androidThemeXml) is present and correctly
 * shaped — replacing the earlier guarded `if (output !== undefined)`
 * pattern that silently passed when an output went missing.
 */
import { describe, it, test } from 'node:test';
import assert                 from 'node:assert/strict';

import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import type {
  InputInterface,
  PaletteStateInterface,
  RoleSchemaInterface,
} from '@studnicky/iridis';
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

interface CapacitorScenarioInterface {
  readonly 'name':     string;
  readonly 'pipeline': readonly string[];
  readonly 'input':    InputInterface;
  assert(state: PaletteStateInterface): void;
}

describe('CapacitorPlugin e2e :: pipeline scenarios', () => {
  const scenarios: readonly CapacitorScenarioInterface[] = [
    {
      'name':     'full capacitor pipeline writes every output slot (statusBar + theme + splash + androidThemeXml)',
      'pipeline': [
        'intake:hex',
        'resolve:roles',
        'derive:variant',
        'emit:capacitorStatusBar',
        'emit:capacitorTheme',
        'emit:capacitorSplashScreen',
        'emit:androidThemeXml',
      ],
      'input': {
        'colors': ['#8b5cf6', '#ffffff', '#ec4899'],
        'roles':  ROLES,
      },
      assert(state): void {
        // The capacitor namespace must exist after any emit task runs.
        const cap = state.outputs['capacitor'] as Record<string, unknown> | undefined;
        assert.ok(cap !== undefined, 'outputs.capacitor namespace present after pipeline');

        // ---- statusBar ----
        const statusBar = cap['statusBar'] as StatusBarOutputInterface | undefined;
        assert.ok(statusBar !== undefined, 'outputs.capacitor.statusBar written by emit:capacitorStatusBar');
        assert.match(statusBar.backgroundColor, /^#[0-9a-f]{6}$/i, 'statusBar.backgroundColor is canonical 6-digit hex');
        assert.ok(['DARK', 'LIGHT'].includes(statusBar.style), `statusBar.style "${statusBar.style}" is DARK or LIGHT`);
        assert.strictEqual(typeof statusBar.overlay, 'boolean', 'statusBar.overlay is boolean');

        // ---- theme ----
        const theme = cap['theme'] as CapacitorThemeOutputInterface | undefined;
        assert.ok(theme !== undefined, 'outputs.capacitor.theme written by emit:capacitorTheme');
        assert.match(theme.primary,       /^#[0-9a-f]{6}$/i, 'theme.primary is hex');
        assert.match(theme.primaryDark,   /^#[0-9a-f]{6}$/i, 'theme.primaryDark is hex');
        assert.match(theme.primaryLight,  /^#[0-9a-f]{6}$/i, 'theme.primaryLight is hex');
        assert.match(theme.accent,        /^#[0-9a-f]{6}$/i, 'theme.accent is hex');
        assert.match(theme.background,    /^#[0-9a-f]{6}$/i, 'theme.background is hex');
        assert.match(theme.surface,       /^#[0-9a-f]{6}$/i, 'theme.surface is hex');
        assert.match(theme.error,         /^#[0-9a-f]{6}$/i, 'theme.error is hex');
        assert.match(theme.warning,       /^#[0-9a-f]{6}$/i, 'theme.warning is hex');
        assert.match(theme.success,       /^#[0-9a-f]{6}$/i, 'theme.success is hex');
        assert.match(theme.info,          /^#[0-9a-f]{6}$/i, 'theme.info is hex');
        assert.match(theme.text,          /^#[0-9a-f]{6}$/i, 'theme.text is hex');
        assert.match(theme.textOnPrimary, /^#[0-9a-f]{6}$/i, 'theme.textOnPrimary is hex');
        assert.match(theme.textOnAccent,  /^#[0-9a-f]{6}$/i, 'theme.textOnAccent is hex');

        // ---- splashScreen ----
        const splash = cap['splashScreen'] as SplashScreenOutputInterface | undefined;
        assert.ok(splash !== undefined, 'outputs.capacitor.splashScreen written by emit:capacitorSplashScreen');
        assert.match(splash.backgroundColor, /^#[0-9a-f]{6}$/i, 'splash.backgroundColor is hex');

        // ---- androidThemeXml ----
        const xml = cap['androidThemeXml'] as string | undefined;
        assert.ok(xml !== undefined, 'outputs.capacitor.androidThemeXml written by emit:androidThemeXml');
        assert.ok(typeof xml === 'string',                          'androidThemeXml is a string');
        assert.ok(xml.includes('<resources>'),                       'androidThemeXml contains <resources> root');
        assert.ok(xml.includes('AppTheme.NoActionBarLaunch'),        'androidThemeXml declares the splash theme style');
        assert.ok(xml.includes('android:statusBarColor'),            'androidThemeXml declares android:statusBarColor');
        assert.ok(xml.includes('android:windowBackground'),          'androidThemeXml declares android:windowBackground');
        // The status-bar XML item must reference the same colour the status-bar emitter chose.
        assert.ok(
          xml.includes(`<item name="android:statusBarColor">${statusBar.backgroundColor}</item>`),
          'androidThemeXml status-bar entry matches emit:capacitorStatusBar output',
        );
      },
    },
  ];

  for (const sc of scenarios) {
    it(sc.name, async () => {
      const engine = freshEngine();
      engine.pipeline(sc.pipeline);
      const state = await engine.run(sc.input);
      sc.assert(state);
    });
  }
});
