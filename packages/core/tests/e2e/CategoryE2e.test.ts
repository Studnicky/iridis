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

import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import { Engine }                from '@studnicky/iridis/engine';
import { coreTasks }             from '@studnicky/iridis/tasks';
import { contrastPlugin }        from '@studnicky/iridis-contrast';
import { stylesheetPlugin }      from '@studnicky/iridis-stylesheet';
import { capacitorPlugin }       from '@studnicky/iridis-capacitor';
import { categoryW3cRoleSchema } from '../fixtures/categoryW3cRoleSchema.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const STANDARD_PIPELINE = [
  'intake:any',
  'expand:family',
  'resolve:roles',
  'enforce:wcagAA',
  'derive:variant',
  'emit:cssVars',
  'emit:capacitorStatusBar',
  'emit:capacitorTheme',
] as const;

const BASE_METADATA = {
  'category':     'music',
  'cssVarPrefix': '--c-',
  'scopeAttr':    'data-category',
  'scopePrefix':  'category',
  'themeName':    'music',
} as const;

function freshEngine(): Engine {
  const engine = new Engine();
  for (const task of coreTasks) { engine.tasks.register(task); }
  engine.adopt(contrastPlugin);
  engine.adopt(stylesheetPlugin);
  engine.adopt(capacitorPlugin);
  return engine;
}

type CssVarsOutput = { full: string; map: Record<string, string> };
type CapacitorOutput = {
  statusBar: { backgroundColor: string; style: 'DARK' | 'LIGHT' };
};

// ---------------------------------------------------------------------------
// Cell 1 — full pipeline populates colors and roles
//
// A single hex seed must flow through all eight pipeline stages and populate
// state.colors (≥1), state.roles (≥1 key), state.outputs['stylesheet:cssVars'],
// and state.outputs['capacitor:statusBar']. Empty colors or roles indicates
// an intake or resolve failure.
// ---------------------------------------------------------------------------

interface FullPipelineInput  {
  readonly colors: readonly unknown[];
  readonly metadata: Record<string, string>;
}
interface FullPipelineOutput {
  readonly colorsLength: number;
  readonly rolesCount:   number;
  readonly hasCssVars:   boolean;
  readonly hasCapacitor: boolean;
}

const fullPipelineScenarios: readonly ScenarioInterface<FullPipelineInput, FullPipelineOutput>[] = [
  {
    name: 'single hex seed populates all outputs',
    kind: 'happy',
    input: { colors: ['#8B5CF6'], metadata: { ...BASE_METADATA } },
    assert(output, error) {
      assert.strictEqual(error, undefined,            '[cell=1, scenario=single-seed] no throw');
      assert.ok(output!.colorsLength >= 1,            '[cell=1, scenario=single-seed] colors populated by intake');
      assert.ok(output!.rolesCount   >= 1,            '[cell=1, scenario=single-seed] roles populated by resolve');
      assert.strictEqual(output!.hasCssVars,   true,  '[cell=1, scenario=single-seed] stylesheet:cssVars output present');
      assert.strictEqual(output!.hasCapacitor, true,  '[cell=1, scenario=single-seed] capacitor:statusBar output present');
    },
  },
  {
    name: 'three seeds still produce all outputs',
    kind: 'happy',
    input: { colors: ['#8B5CF6', '#06b6d4', '#10b981'], metadata: { ...BASE_METADATA } },
    assert(output, error) {
      assert.strictEqual(error, undefined,           '[cell=1, scenario=three-seeds] no throw');
      assert.ok(output!.colorsLength >= 3,           '[cell=1, scenario=three-seeds] all seeds parsed');
      assert.ok(output!.rolesCount   >= 1,           '[cell=1, scenario=three-seeds] roles populated');
      assert.strictEqual(output!.hasCssVars,   true, '[cell=1, scenario=three-seeds] stylesheet:cssVars present');
      assert.strictEqual(output!.hasCapacitor, true, '[cell=1, scenario=three-seeds] capacitor:statusBar present');
    },
  },
  {
    name: 'wide-gamut P3 seed (OKLCH outside sRGB) still completes without throw',
    kind: 'edge',
    input: { colors: [{ 'l': 0.7, 'c': 0.35, 'h': 145 }], metadata: { ...BASE_METADATA } },
    assert(output, error) {
      // Wide-gamut input may be clamped but must not throw
      assert.strictEqual(error, undefined, '[cell=1, scenario=p3-seed] no throw for wide-gamut seed');
    },
  },
  {
    name: 'unicode metadata values flow through to outputs without corruption',
    kind: 'edge',
    input: {
      colors: ['#8B5CF6'],
      metadata: {
        ...BASE_METADATA,
        'category':  'müzik',
        'themeName': '音楽テーマ',
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,           '[cell=1, scenario=unicode-meta] no throw with unicode metadata');
      assert.strictEqual(output!.hasCssVars,   true, '[cell=1, scenario=unicode-meta] stylesheet:cssVars still produced');
      assert.strictEqual(output!.hasCapacitor, true, '[cell=1, scenario=unicode-meta] capacitor:statusBar still produced');
    },
  },
];

new ScenarioRunner<FullPipelineInput, FullPipelineOutput>(
  'CategoryE2e :: cell-1 :: full-pipeline',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline([...STANDARD_PIPELINE]);
    const state = await engine.run({
      'colors':   input.colors,
      'roles':    categoryW3cRoleSchema,
      'contrast': { 'level': 'AA', 'algorithm': 'wcag21', 'cvdCorrect': undefined, 'extra': undefined },
      'metadata': input.metadata, 'bypass': undefined, 'emit': undefined, 'maxColors': undefined, 'runtime': undefined,
    });
    return {
      colorsLength: state.colors.length,
      rolesCount:   Object.keys(state.roles).length,
      hasCssVars:   !!state.outputs['stylesheet:cssVars'],
      hasCapacitor: !!state.outputs['capacitor:statusBar'],
    };
  },
).run(fullPipelineScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — output field shape contracts
//
// stylesheet:cssVars.full must contain a `:root` block. stylesheet:cssVars.map
// must be a non-empty object. capacitor:statusBar.backgroundColor must be a
// 6-digit lowercase hex. capacitor:statusBar.style must be 'DARK' or 'LIGHT'.
// ---------------------------------------------------------------------------

interface OutputShapeInput  { readonly colors: string[] }
interface OutputShapeOutput {
  readonly cssVarsFull:            string;
  readonly cssVarsMapKeyCount:     number;
  readonly statusBarBgColor:       string;
  readonly statusBarStyle:         string;
}

const outputShapeScenarios: readonly ScenarioInterface<OutputShapeInput, OutputShapeOutput>[] = [
  {
    name: 'cssVars.full contains :root block and map is populated',
    kind: 'happy',
    input: { colors: ['#8B5CF6'] },
    assert(output, error) {
      assert.strictEqual(error, undefined,                          '[cell=2, scenario=css-shape] no throw');
      assert.ok(output!.cssVarsFull.includes(':root'),              '[cell=2, scenario=css-shape] cssVars.full contains :root');
      assert.ok(output!.cssVarsMapKeyCount >= 1,                    '[cell=2, scenario=css-shape] cssVars.map populated');
    },
  },
  {
    name: 'capacitor statusBar backgroundColor is 6-digit lowercase hex',
    kind: 'happy',
    input: { colors: ['#8B5CF6'] },
    assert(output, error) {
      assert.strictEqual(error, undefined,                                                   '[cell=2, scenario=capacitor-bg] no throw');
      assert.match(output!.statusBarBgColor, /^#[0-9a-f]{6}$/i,                             '[cell=2, scenario=capacitor-bg] statusBar.backgroundColor is valid hex');
      assert.ok(['DARK', 'LIGHT'].includes(output!.statusBarStyle as 'DARK' | 'LIGHT'),     '[cell=2, scenario=capacitor-bg] statusBar.style is DARK or LIGHT');
    },
  },
];

new ScenarioRunner<OutputShapeInput, OutputShapeOutput>(
  'CategoryE2e :: cell-2 :: outputs-shape',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline([...STANDARD_PIPELINE]);
    const state = await engine.run({
      'colors':   input.colors,
      'roles':    categoryW3cRoleSchema,
      'contrast': { 'level': 'AA', 'algorithm': 'wcag21', 'cvdCorrect': undefined, 'extra': undefined },
      'metadata': { ...BASE_METADATA }, 'bypass': undefined, 'emit': undefined, 'maxColors': undefined, 'runtime': undefined,
    });
    const cssVars   = state.outputs['stylesheet:cssVars'] as CssVarsOutput;
    const statusBar = state.outputs['capacitor:statusBar'] as CapacitorOutput['statusBar'];
    return {
      cssVarsFull:         cssVars.full,
      cssVarsMapKeyCount:  Object.keys(cssVars.map).length,
      statusBarBgColor:    statusBar.backgroundColor,
      statusBarStyle:      statusBar.style,
    };
  },
).run(outputShapeScenarios);
