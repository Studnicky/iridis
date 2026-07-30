/**
 * CategoryE2e — scenario-matrix suite.
 *
 * Subject: full W3C-conformant category-palette pipeline.
 * Uses the real coreTasks + contrastPlugin + stylesheetPlugin + capacitorPlugin
 * against the canonical categoryW3cRoleSchema. Every scenario drives a fresh
 * Engine instance to prevent shared state.
 *
 * Cells:
 *   1. full-pipeline     — single hex seed, all outputs populated, shape contracts
 *   2. outputs shape     — cssVars and capacitor output field contracts
 *   3. multi-seed        — three seeds, roles still populated
 *   4. edge inputs       — P3/wide-gamut seed, unicode metadata values
 */

import type { InputInterface } from '@studnicky/iridis';

import { capacitorPlugin }  from '@studnicky/iridis-capacitor';
import { contrastPlugin }   from '@studnicky/iridis-contrast';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { Engine }    from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert         from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner }        from '../_runner/ScenarioRunner.ts';
import { categoryW3cRoleSchema } from '../fixtures/categoryW3cRoleSchema.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const STANDARD_PIPELINE = [
  'intake:any',
  'resolve:roles',
  'expand:family',
  'enforce:wcagAA',
  'derive:variant',
  'emit:cssVars',
  'emit:capacitorStatusBar',
  'emit:capacitorTheme'
] as const;

const BASE_METADATA = {
  'category':     'music',
  'cssVarPrefix': '--c-',
  'scopeAttr':    'data-category',
  'scopePrefix':  'category',
  'themeName':    'music'
} as const;

/**
 * Cross-layer plugin wiring for the CLI composition boundary. The CLI owns
 * the assembled consumer pipeline across core and output plugins.
 */
class TestEngineFactory {
  static create(): Engine {
    const engine = new Engine();
    for (const task of coreTasks) { engine.tasks.register(task); }
    engine.adopt(contrastPlugin);
    engine.adopt(stylesheetPlugin);
    engine.adopt(capacitorPlugin);
    return engine;
  }
}

type CssVarsOutput = { 'full': string; 'map': Record<string, string> };

// ---------------------------------------------------------------------------
// Cell 1 — full pipeline populates colors and roles
//
// A single hex seed must flow through all eight pipeline stages and populate
// state.colors (≥1), state.roles (≥1 key), state.outputs['stylesheet:cssVars'],
// and state.outputs['capacitor:statusBar']. Empty colors or roles indicates
// an intake or resolve failure.
// ---------------------------------------------------------------------------

interface FullPipelineInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'metadata': Record<string, string>;
}

const fullPipelineScenarios: readonly ScenarioInterface<FullPipelineInputInterface, {
  readonly 'colorsLength': number;
  readonly 'hasCapacitor': boolean;
  readonly 'hasCssVars':   boolean;
  readonly 'hasOnAccent':  boolean;
  readonly 'rolesCount':   number;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,            '[cell=1, scenario=single-seed] no throw');
      assert.ok(output!.colorsLength >= 1,            '[cell=1, scenario=single-seed] colors populated by intake');
      assert.ok(output!.rolesCount   >= 1,            '[cell=1, scenario=single-seed] roles populated by resolve');
      assert.strictEqual(output!.hasCssVars,   true,  '[cell=1, scenario=single-seed] stylesheet:cssVars output present');
      assert.strictEqual(output!.hasCapacitor, true,  '[cell=1, scenario=single-seed] capacitor:statusBar output present');
      assert.strictEqual(output!.hasOnAccent,  true,  '[cell=1, scenario=single-seed] derived onAccent role present');
    },
    'input': { 'colors': ['#8B5CF6'], 'metadata': { ...BASE_METADATA } },
    'kind': 'happy',
    'name': 'single hex seed populates all outputs'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,           '[cell=1, scenario=three-seeds] no throw');
      assert.ok(output!.colorsLength >= 3,           '[cell=1, scenario=three-seeds] all seeds parsed');
      assert.ok(output!.rolesCount   >= 1,           '[cell=1, scenario=three-seeds] roles populated');
      assert.strictEqual(output!.hasCssVars,   true, '[cell=1, scenario=three-seeds] stylesheet:cssVars present');
      assert.strictEqual(output!.hasCapacitor, true, '[cell=1, scenario=three-seeds] capacitor:statusBar present');
      assert.strictEqual(output!.hasOnAccent,  true, '[cell=1, scenario=three-seeds] derived onAccent role present');
    },
    'input': { 'colors': ['#8B5CF6', '#06b6d4', '#10b981'], 'metadata': { ...BASE_METADATA } },
    'kind': 'happy',
    'name': 'three seeds still produce all outputs'
  },
  {
    'assert': function(output, error) {
      // Wide-gamut input may be clamped but must not throw
      assert.strictEqual(error, undefined, '[cell=1, scenario=p3-seed] no throw for wide-gamut seed');
    },
    'input': { 'colors': [{ 'c': 0.35, 'h': 145, 'l': 0.7 }], 'metadata': { ...BASE_METADATA } },
    'kind': 'edge',
    'name': 'wide-gamut P3 seed (OKLCH outside sRGB) still completes without throw'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,           '[cell=1, scenario=unicode-meta] no throw with unicode metadata');
      assert.strictEqual(output!.hasCssVars,   true, '[cell=1, scenario=unicode-meta] stylesheet:cssVars still produced');
      assert.strictEqual(output!.hasCapacitor, true, '[cell=1, scenario=unicode-meta] capacitor:statusBar still produced');
    },
    'input': {
      'colors': ['#8B5CF6'],
      'metadata': {
        ...BASE_METADATA,
        'category':  'müzik',
        'themeName': '音楽テーマ'
      }
    },
    'kind': 'edge',
    'name': 'unicode metadata values flow through to outputs without corruption'
  }
];

await new ScenarioRunner<FullPipelineInputInterface, {
  readonly 'colorsLength': number;
  readonly 'hasCapacitor': boolean;
  readonly 'hasCssVars':   boolean;
  readonly 'hasOnAccent':  boolean;
  readonly 'rolesCount':   number;
}>(
  'CategoryE2e :: cell-1 :: full-pipeline',
  (input) => {
    const engine = TestEngineFactory.create();
    engine.pipeline([...STANDARD_PIPELINE]);
    const state = engine.run({
      'bypass': undefined,
      'colors':   input.colors,
      'contrast': { 'algorithm': 'wcag21', 'cvdCorrect': undefined, 'extra': undefined, 'level': 'AA' },
      'emit': undefined, 'maxColors': undefined, 'metadata': input.metadata, 'roles':    categoryW3cRoleSchema, 'runtime': undefined
    });
    const capacitorOutput = state.outputs['capacitor:statusBar'];
    const cssVarsOutput   = state.outputs['stylesheet:cssVars'];
    return {
      'colorsLength': state.colors.length,
      'hasCapacitor': Boolean(capacitorOutput),
      'hasCssVars':   Boolean(cssVarsOutput),
      'hasOnAccent':  Object.hasOwn(state.roles, 'onAccent'),
      'rolesCount':   Object.keys(state.roles).length
    };
  }
).run(fullPipelineScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — output field shape contracts
//
// stylesheet:cssVars.full must contain a `:root` block. stylesheet:cssVars.map
// must be a non-empty object. capacitor:statusBar.backgroundColor must be a
// 6-digit lowercase hex. capacitor:statusBar.style must be 'DARK' or 'LIGHT'.
// ---------------------------------------------------------------------------

type OutputShapeInput =  { readonly 'colors': string[] };

const outputShapeScenarios: readonly ScenarioInterface<OutputShapeInput, {
  readonly 'cssVarsFull':        string;
  readonly 'cssVarsMapKeyCount': number;
  readonly 'statusBarBgColor':   string;
  readonly 'statusBarStyle':     string;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                          '[cell=2, scenario=css-shape] no throw');
      assert.ok(output!.cssVarsFull.includes(':root'),              '[cell=2, scenario=css-shape] cssVars.full contains :root');
      assert.ok(output!.cssVarsMapKeyCount >= 1,                    '[cell=2, scenario=css-shape] cssVars.map populated');
    },
    'input': { 'colors': ['#8B5CF6'] },
    'kind': 'happy',
    'name': 'cssVars.full contains :root block and map is populated'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                                                   '[cell=2, scenario=capacitor-bg] no throw');
      assert.match(output!.statusBarBgColor, /^#[0-9a-f]{6}$/i,                             '[cell=2, scenario=capacitor-bg] statusBar.backgroundColor is valid hex');
      assert.ok(new Set(['DARK', 'LIGHT']).has(output!.statusBarStyle),     '[cell=2, scenario=capacitor-bg] statusBar.style is DARK or LIGHT');
    },
    'input': { 'colors': ['#8B5CF6'] },
    'kind': 'happy',
    'name': 'capacitor statusBar backgroundColor is 6-digit lowercase hex'
  }
];

await new ScenarioRunner<OutputShapeInput, {
  readonly 'cssVarsFull':        string;
  readonly 'cssVarsMapKeyCount': number;
  readonly 'statusBarBgColor':   string;
  readonly 'statusBarStyle':     string;
}>(
  'CategoryE2e :: cell-2 :: outputs-shape',
  (input) => {
    const engine = TestEngineFactory.create();
    engine.pipeline([...STANDARD_PIPELINE]);
    const state = engine.run({
      'bypass': undefined,
      'colors':   input.colors,
      'contrast': { 'algorithm': 'wcag21', 'cvdCorrect': undefined, 'extra': undefined, 'level': 'AA' },
      'emit': undefined, 'maxColors': undefined, 'metadata': { ...BASE_METADATA }, 'roles':    categoryW3cRoleSchema, 'runtime': undefined
    });
    const cssVars   = state.outputs['stylesheet:cssVars'] as CssVarsOutput;
    const statusBar = state.outputs['capacitor:statusBar'] as { 'backgroundColor': string; 'style': 'DARK' | 'LIGHT' };
    return {
      'cssVarsFull':         cssVars.full,
      'cssVarsMapKeyCount':  Object.keys(cssVars.map).length,
      'statusBarBgColor':    statusBar.backgroundColor,
      'statusBarStyle':      statusBar.style
    };
  }
).run(outputShapeScenarios);
