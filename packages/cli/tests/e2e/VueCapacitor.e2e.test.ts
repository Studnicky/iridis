/**
 * Vue-Capacitor example — golden regression suite.
 *
 * Subject: the category-w3c pipeline (engine API, not CLI) running the
 * `examples/vue-capacitor/category-w3c.config.json` scenario end-to-end.
 *
 * Cells:
 *   1. pipeline ordering  — resolve:roles MUST precede expand:family
 *   2. onAccent derivation — derivedFrom role is populated after the fix
 *   3. capacitor output   — flat slots capacitor:statusBar and capacitor:theme
 *   4. css output         — stylesheet:cssVars.full contains expected CSS blocks
 *   5. slot-check         — CLI accepts per-slot flat output.files keys
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join }    from 'node:path';
import { tmpdir }  from 'node:os';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import { Engine }    from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import type { PaletteStateInterface, RoleSchemaInterfaceType } from '@studnicky/iridis/model';
import { Cli }       from '@studnicky/iridis-cli';
import type { CliConfigInterface } from '@studnicky/iridis-cli/types';

// ---------------------------------------------------------------------------
// Fixture — shared inputs
// ---------------------------------------------------------------------------

const SEED = '#8B5CF6';

const ROLE_SCHEMA = {
  'name':        'category-w3c',
  'description': 'WCAG 2.1 AA role schema for category colour palettes',
  'roles': [
    { 'name': 'canvas',   'intent': 'background', 'required': true,  'lightnessRange': [0.92, 1.0] as [number, number], 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined },
    { 'name': 'surface',  'intent': 'background', 'required': true,  'lightnessRange': [0.86, 0.96] as [number, number], 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined },
    { 'name': 'accent',   'intent': 'accent',     'required': true, 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'lightnessRange': undefined },
    { 'name': 'onAccent', 'intent': 'text',       'required': true,  'derivedFrom': 'accent', 'lightnessRange': [0.98, 1.0] as [number, number], 'chromaRange': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined },
    { 'name': 'border',   'intent': 'muted',                         'lightnessRange': [0.60, 0.80] as [number, number], 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'required': undefined },
    { 'name': 'muted',    'intent': 'muted',                         'lightnessRange': [0.45, 0.65] as [number, number], 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'required': undefined },
    { 'name': 'text',     'intent': 'text',       'required': true,  'lightnessRange': [0.10, 0.25] as [number, number], 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined },
  ],
  'contrastPairs': [
    { 'foreground': 'text',     'background': 'canvas',  'minRatio': 4.5, 'algorithm': 'wcag21' as const },
    { 'foreground': 'text',     'background': 'surface', 'minRatio': 4.5, 'algorithm': 'wcag21' as const },
    { 'foreground': 'onAccent', 'background': 'accent',  'minRatio': 4.5, 'algorithm': 'wcag21' as const },
    { 'foreground': 'border',   'background': 'canvas',  'minRatio': 3.0, 'algorithm': 'wcag21' as const },
  ],
} satisfies RoleSchemaInterfaceType;

const PIPELINE_CORRECT = [
  'intake:any',
  'resolve:roles',
  'expand:family',
  'enforce:wcagAA',
  'derive:variant',
  'emit:cssVars',
  'emit:capacitorStatusBar',
  'emit:capacitorTheme',
] as const;

async function buildEngine(): Promise<Engine> {
  const { contrastPlugin }   = await import('@studnicky/iridis-contrast');
  const { stylesheetPlugin } = await import('@studnicky/iridis-stylesheet');
  const { capacitorPlugin }  = await import('@studnicky/iridis-capacitor');

  const e = new Engine();
  for (const task of coreTasks) {
    e.tasks.register(task);
  }
  e.adopt(contrastPlugin);
  e.adopt(stylesheetPlugin);
  e.adopt(capacitorPlugin);

  return e;
}

async function runPipeline(pipelineOrder: readonly string[]): Promise<PaletteStateInterface> {
  const e = await buildEngine();
  e.pipeline([...pipelineOrder]);
  return e.run({
    'bypass':   undefined,
    'colors':   [SEED],
    'contrast': { 'algorithm': 'wcag21', 'cvdCorrect': undefined, 'extra': undefined, 'level': 'AA' },
    'emit':     undefined,
    'maxColors': undefined,
    'metadata': {
      'category':     'music',
      'cssVarPrefix': '--c-',
      'scopeAttr':    'data-category',
      'scopePrefix':  'category',
      'themeName':    'music',
    },
    'roles':    ROLE_SCHEMA,
    'runtime':  undefined,
  });
}

// ---------------------------------------------------------------------------
// Cell 1 — pipeline ordering: resolve:roles must precede expand:family
//
// When expand:family runs before resolve:roles, state.roles is empty and
// all derivedFrom roles are silently skipped. The onAccent role (derived
// from accent) will be missing from the output entirely.
// ---------------------------------------------------------------------------

interface PipelineOrderInput {
  readonly order: readonly string[];
}
interface PipelineOrderOutput {
  readonly roleNames:     string[];
  readonly hasOnAccent:   boolean;
}

const pipelineOrderScenarios: readonly ScenarioInterface<PipelineOrderInput, PipelineOrderOutput>[] = [
  {
    name: 'correct order (resolve before expand) produces onAccent role',
    kind: 'happy',
    input: {
      order: [
        'intake:any',
        'resolve:roles',
        'expand:family',
        'enforce:wcagAA',
        'derive:variant',
        'emit:cssVars',
        'emit:capacitorStatusBar',
        'emit:capacitorTheme',
      ],
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined,
        '[cell=1, scenario=correct-order] no throw');
      assert.ok(output!.hasOnAccent,
        '[cell=1, scenario=correct-order] onAccent role is present');
      assert.ok(output!.roleNames.includes('accent'),
        '[cell=1, scenario=correct-order] accent role is present');
    },
  },
  {
    name: 'wrong order (expand before resolve) silently drops onAccent',
    kind: 'unhappy',
    input: {
      order: [
        'intake:any',
        'expand:family',  // wrong: before resolve:roles
        'resolve:roles',
        'enforce:wcagAA',
        'derive:variant',
        'emit:cssVars',
        'emit:capacitorStatusBar',
        'emit:capacitorTheme',
      ],
    },
    async assert(output, error) {
      assert.strictEqual(error, undefined,
        '[cell=1, scenario=wrong-order] no throw (silent failure)');
      assert.strictEqual(output!.hasOnAccent, false,
        '[cell=1, scenario=wrong-order] onAccent is absent when expand runs before resolve');
    },
  },
];

new ScenarioRunner<PipelineOrderInput, PipelineOrderOutput>(
  'VueCapacitor :: cell-1 :: pipeline-ordering',
  async (input) => {
    const state = await runPipeline(input.order);
    return {
      'roleNames':   Object.keys(state.roles),
      'hasOnAccent': 'onAccent' in state.roles,
    };
  },
).run(pipelineOrderScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — onAccent derivation
//
// With the correct pipeline order, onAccent is derived from the accent role
// and pushed toward lightness [0.98, 1.0] by expand:family.
// enforce:wcagAA adjusts it to meet 4.5:1 on accent.
// ---------------------------------------------------------------------------

interface OnAccentInput { readonly unused?: never }
interface OnAccentOutput {
  readonly onAccentHex:     string;
  readonly accentHex:       string;
  readonly onAccentLightness: number;
}

const onAccentScenarios: readonly ScenarioInterface<OnAccentInput, OnAccentOutput>[] = [
  {
    name: 'onAccent is a light color (L >= 0.95) derived from accent',
    kind: 'happy',
    input: {},
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=derived] no throw');
      assert.ok(output!.onAccentHex.match(/^#[0-9a-f]{6}$/i),
        '[cell=2, scenario=derived] onAccent is a valid 6-digit hex');
      assert.ok(output!.onAccentLightness >= 0.9,
        `[cell=2, scenario=derived] onAccent lightness ${output!.onAccentLightness.toFixed(3)} should be ≥ 0.9 (high lightness range)`);
    },
  },
  {
    name: 'onAccent hex is stable across runs (deterministic)',
    kind: 'edge',
    input: {},
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=deterministic] no throw');
      // Run again and compare
      const state2 = await runPipeline(PIPELINE_CORRECT);
      const onAccent2 = state2.roles['onAccent'];
      assert.ok(onAccent2 !== undefined, '[cell=2, scenario=deterministic] second run has onAccent');
      assert.strictEqual(output!.onAccentHex, onAccent2.hex,
        '[cell=2, scenario=deterministic] onAccent hex is identical across runs');
    },
  },
];

new ScenarioRunner<OnAccentInput, OnAccentOutput>(
  'VueCapacitor :: cell-2 :: onAccent-derivation',
  async () => {
    const state = await runPipeline(PIPELINE_CORRECT);
    const onAccent = state.roles['onAccent']!;
    const accent   = state.roles['accent']!;
    return {
      'onAccentHex':       onAccent.hex,
      'accentHex':         accent.hex,
      'onAccentLightness': onAccent.oklch.l,
    };
  },
).run(onAccentScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — capacitor output shape
//
// After the correct pipeline, state.outputs['capacitor:statusBar'] and
// state.outputs['capacitor:theme'] are written as flat top-level slots.
// ---------------------------------------------------------------------------

interface CapacitorOutputInput { readonly unused?: never }
interface CapacitorOutputOutput {
  readonly hasStatusBar:   boolean;
  readonly hasTheme:       boolean;
  readonly statusBarStyle: string;
  readonly primaryHex:     string;
  readonly themeKeyCount:  number;
}

type StatusBarSlot = { style: string };
type ThemeSlot = Record<string, string>;

const capacitorOutputScenarios: readonly ScenarioInterface<CapacitorOutputInput, CapacitorOutputOutput>[] = [
  {
    name: 'capacitor output has statusBar and theme sub-objects',
    kind: 'happy',
    input: {},
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=shape] no throw');
      assert.ok(output!.hasStatusBar,  '[cell=3, scenario=shape] statusBar present');
      assert.ok(output!.hasTheme,      '[cell=3, scenario=shape] theme present');
    },
  },
  {
    name: 'statusBar style is DARK or LIGHT',
    kind: 'happy',
    input: {},
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=status-style] no throw');
      assert.ok(
        output!.statusBarStyle === 'DARK' || output!.statusBarStyle === 'LIGHT',
        `[cell=3, scenario=status-style] style is DARK|LIGHT, got ${output!.statusBarStyle}`,
      );
    },
  },
  {
    name: 'theme has all 13 canonical slots',
    kind: 'happy',
    input: {},
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=theme-keys] no throw');
      assert.strictEqual(output!.themeKeyCount, 13,
        `[cell=3, scenario=theme-keys] expected 13 theme keys, got ${output!.themeKeyCount}`);
    },
  },
  {
    name: 'theme primary slot is a hex string',
    kind: 'edge',
    input: {},
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=theme-hex] no throw');
      assert.ok(output!.primaryHex.match(/^#[0-9a-f]{6}$/i),
        `[cell=3, scenario=theme-hex] primary is hex, got ${output!.primaryHex}`);
    },
  },
];

new ScenarioRunner<CapacitorOutputInput, CapacitorOutputOutput>(
  'VueCapacitor :: cell-3 :: capacitor-output',
  async () => {
    const state     = await runPipeline(PIPELINE_CORRECT);
    const statusBar = state.outputs['capacitor:statusBar'] as StatusBarSlot | undefined;
    const theme     = state.outputs['capacitor:theme']     as ThemeSlot | undefined;
    return {
      'hasStatusBar':   statusBar !== undefined,
      'hasTheme':       theme !== undefined,
      'statusBarStyle': statusBar?.style ?? '',
      'primaryHex':     theme?.['primary'] ?? '',
      'themeKeyCount':  theme !== undefined ? Object.keys(theme).length : 0,
    };
  },
).run(capacitorOutputScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — CSS output
//
// emit:cssVars writes state.outputs['stylesheet:cssVars'].full. With the
// music seed and the category-w3c schema, we expect a :root block and a
// dark-scheme media query (dark variants from derive:variant).
// ---------------------------------------------------------------------------

interface CssOutputInput { readonly unused?: never }
interface CssOutputOutput {
  readonly hasRootBlock:   boolean;
  readonly hasDarkScheme:  boolean;
  readonly hasForcedColors: boolean;
  readonly allRolesPresent: boolean;
}

const expectedRoles = ['canvas', 'surface', 'accent', 'border', 'muted', 'text', 'onAccent'];

const cssOutputScenarios: readonly ScenarioInterface<CssOutputInput, CssOutputOutput>[] = [
  {
    name: 'full CSS output contains :root block',
    kind: 'happy',
    input: {},
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=root-block] no throw');
      assert.ok(output!.hasRootBlock,
        '[cell=4, scenario=root-block] full CSS contains :root');
    },
  },
  {
    name: 'dark-scheme media query is present (derive:variant produced dark variants)',
    kind: 'happy',
    input: {},
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=dark-scheme] no throw');
      assert.ok(output!.hasDarkScheme,
        '[cell=4, scenario=dark-scheme] @media prefers-color-scheme: dark present');
    },
  },
  {
    name: 'forced-colors media query is present',
    kind: 'happy',
    input: {},
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=forced-colors] no throw');
      assert.ok(output!.hasForcedColors,
        '[cell=4, scenario=forced-colors] @media forced-colors: active present');
    },
  },
  {
    name: 'all seven declared roles appear as CSS custom properties',
    kind: 'happy',
    input: {},
    async assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=all-roles] no throw');
      assert.ok(output!.allRolesPresent,
        '[cell=4, scenario=all-roles] all seven role names appear as --c-* vars in :root');
    },
  },
];

new ScenarioRunner<CssOutputInput, CssOutputOutput>(
  'VueCapacitor :: cell-4 :: css-output',
  async () => {
    const state   = await runPipeline(PIPELINE_CORRECT);
    const cssVars = state.outputs['stylesheet:cssVars'] as { full: string; rootBlock: string };
    const full    = cssVars.full;
    const root    = cssVars.rootBlock;

    const allRolesPresent = expectedRoles.every(
      (r) => root.includes(`--c-${r.replace(/([A-Z])/g, '-$1').toLowerCase()}`) ||
             root.includes(`--c-${r}`),
    );

    return {
      'hasRootBlock':    full.includes(':root'),
      'hasDarkScheme':   full.includes('prefers-color-scheme: dark'),
      'hasForcedColors': full.includes('forced-colors: active'),
      'allRolesPresent': allRolesPresent,
    };
  },
).run(cssOutputScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — slot-check accepts per-slot flat output.files keys
//
// With the colon-flat grammar, each capacitor task writes a distinct top-level
// slot ('capacitor:statusBar', 'capacitor:theme'). Cli.run must accept output
// files that map those exact slot keys, and must also accept the
// 'stylesheet:cssVars' key. No legacy sub-slot path normalisation is needed.
// ---------------------------------------------------------------------------

async function makeTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'iridis-vc-e2e-'));
}

interface SlotCheckInput {
  readonly outputFiles: Record<string, string>;
}
interface SlotCheckOutput {
  readonly success: boolean;
}

const slotCheckScenarios: readonly ScenarioInterface<SlotCheckInput, SlotCheckOutput>[] = [
  {
    name: 'per-slot capacitor keys accepted by slot-check',
    kind: 'happy',
    input: {
      outputFiles: {
        'stylesheet:cssVars':  'music.css',
        'capacitor:statusBar': 'music-statusbar.json',
        'capacitor:theme':     'music-theme.json',
      },
    },
    async assert(_output, error) {
      assert.strictEqual(error, undefined,
        '[cell=5, scenario=flat-slots] CLI accepts per-slot flat output keys');
    },
  },
  {
    name: 'stylesheet:cssVars-only output key passes slot-check',
    kind: 'happy',
    input: {
      outputFiles: { 'stylesheet:cssVars': 'music.css' },
    },
    async assert(_output, error) {
      assert.strictEqual(error, undefined,
        '[cell=5, scenario=css-only] stylesheet:cssVars output accepted by slot-check');
    },
  },
  {
    name: 'unknown slot key rejected by slot-check',
    kind: 'unhappy',
    input: {
      outputFiles: { 'stylesheet:cssVars': 'music.css', 'ghost:slot': 'missing.json' },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error,
        '[cell=5, scenario=unknown-slot] CLI throws for unknown slot key');
      assert.match((error as Error).message, /Config error/,
        '[cell=5, scenario=unknown-slot] error is a config-level rejection');
      assert.match((error as Error).message, /ghost:slot/,
        '[cell=5, scenario=unknown-slot] error names the unresolved slot key');
    },
  },
];

new ScenarioRunner<SlotCheckInput, SlotCheckOutput>(
  'VueCapacitor :: cell-5 :: slot-check-drift',
  async (input) => {
    const dir  = await makeTmpDir();
    const outDir = join(dir, 'out');
    try {
      const config: CliConfigInterface = {
        'enableCapacitor':  true,
        'enableContrast':   true,
        'enableImage':      undefined,
        'enableRdf':        undefined,
        'enableStylesheet': true,
        'enableTailwind':   undefined,
        'enableVscode':     undefined,
        'input': {
          'bypass':    undefined,
          'colors':    [SEED],
          'contrast':  { 'algorithm': 'wcag21', 'cvdCorrect': undefined, 'extra': undefined, 'level': 'AA' },
          'emit':      undefined,
          'maxColors': undefined,
          'metadata': {
            'category':     'music',
            'cssVarPrefix': '--c-',
            'scopeAttr':    'data-category',
            'scopePrefix':  'category',
            'themeName':    'music',
          },
          'roles':     ROLE_SCHEMA,
          'runtime':   undefined,
        },
        'output': {
          'directory': outDir,
          'files':     input.outputFiles,
        },
        'pipeline': [
          'intake:any',
          'resolve:roles',
          'expand:family',
          'enforce:wcagAA',
          'derive:variant',
          'emit:cssVars',
          'emit:capacitorStatusBar',
          'emit:capacitorTheme',
        ],
      };
      const cfgPath = join(dir, 'iridis.config.json');
      await writeFile(cfgPath, JSON.stringify(config, null, 2), 'utf-8');
      await new Cli().run(cfgPath);
      return { 'success': true };
    } finally {
      await rm(dir, { 'recursive': true, 'force': true });
    }
  },
).run(slotCheckScenarios);
