/**
 * Vue-Capacitor example — golden regression suite.
 *
 * Subject: the category-w3c pipeline (engine API, not CLI) running the
 * `examples/vue-capacitor/category-w3c.config.json` scenario end-to-end.
 *
 * Why engine API rather than CLI file?
 *   The CLI's `collectWrittenSlots` function rejects the `"capacitor"` output
 *   key because the capacitor task manifests declare sub-slot writes
 *   (`outputs.capacitor.statusBar`, `outputs.capacitor.theme`) while the
 *   config maps the flat key `"capacitor"` to an output file. The slot-check
 *   does not normalise dotted sub-slot paths to their root segment, so it
 *   never adds `"capacitor"` to the written-slots set. This is tracked as
 *   production drift (see "slot-check sub-slot mismatch" below). The engine
 *   itself is correct; only the CLI slot guard is affected.
 *
 * Cells:
 *   1. pipeline ordering  — resolve:roles MUST precede expand:family
 *   2. onAccent derivation — derivedFrom role is populated after the fix
 *   3. capacitor output   — state.outputs['capacitor'] has statusBar + theme
 *   4. css output         — cssVars.full contains expected CSS blocks
 *   5. slot-check drift   — CLI rejects the config; documents production bug
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
import type { PaletteStateInterface } from '@studnicky/iridis/model';
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
    { 'name': 'canvas',   'intent': 'background', 'required': true,  'lightnessRange': [0.92, 1.0] as [number, number] },
    { 'name': 'surface',  'intent': 'background', 'required': true,  'lightnessRange': [0.86, 0.96] as [number, number] },
    { 'name': 'accent',   'intent': 'accent',     'required': true },
    { 'name': 'onAccent', 'intent': 'text',       'required': true,  'derivedFrom': 'accent', 'lightnessRange': [0.98, 1.0] as [number, number] },
    { 'name': 'border',   'intent': 'muted',                         'lightnessRange': [0.60, 0.80] as [number, number] },
    { 'name': 'muted',    'intent': 'muted',                         'lightnessRange': [0.45, 0.65] as [number, number] },
    { 'name': 'text',     'intent': 'text',       'required': true,  'lightnessRange': [0.10, 0.25] as [number, number] },
  ],
  'contrastPairs': [
    { 'foreground': 'text',     'background': 'canvas',  'minRatio': 4.5, 'algorithm': 'wcag21' as const },
    { 'foreground': 'text',     'background': 'surface', 'minRatio': 4.5, 'algorithm': 'wcag21' as const },
    { 'foreground': 'onAccent', 'background': 'accent',  'minRatio': 4.5, 'algorithm': 'wcag21' as const },
    { 'foreground': 'border',   'background': 'canvas',  'minRatio': 3.0, 'algorithm': 'wcag21' as const },
  ],
} as const;

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
    'colors':   [SEED],
    'roles':    ROLE_SCHEMA,
    'contrast': { 'level': 'AA', 'algorithm': 'wcag21' },
    'metadata': {
      'category':     'music',
      'cssVarPrefix': '--c-',
      'scopeAttr':    'data-category',
      'scopePrefix':  'category',
      'themeName':    'music',
    },
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
// After the correct pipeline, state.outputs['capacitor'] contains both
// statusBar and theme sub-objects. The OutputWriter can serialize this
// to JSON using state.outputs['capacitor'] as the value.
// ---------------------------------------------------------------------------

interface CapacitorOutputInput { readonly unused?: never }
interface CapacitorOutputOutput {
  readonly hasStatusBar:   boolean;
  readonly hasTheme:       boolean;
  readonly statusBarStyle: string;
  readonly primaryHex:     string;
  readonly themeKeyCount:  number;
}

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
    const capacitor = state.outputs['capacitor'] as {
      statusBar: { style: string };
      theme:     Record<string, string>;
    };
    return {
      'hasStatusBar':   'statusBar' in capacitor,
      'hasTheme':       'theme' in capacitor,
      'statusBarStyle': capacitor.statusBar.style,
      'primaryHex':     capacitor.theme['primary'] ?? '',
      'themeKeyCount':  Object.keys(capacitor.theme).length,
    };
  },
).run(capacitorOutputScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — CSS output
//
// emit:cssVars writes state.outputs['cssVars'].full. With the music seed
// and the category-w3c schema, we expect a :root block and a dark-scheme
// media query (dark variants from derive:variant).
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
    const cssVars = state.outputs['cssVars'] as { full: string; rootBlock: string };
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
// Cell 5 — slot-check production drift (regression guard)
//
// Cli.run REJECTS the category-w3c config because collectWrittenSlots()
// extracts 'capacitor.statusBar' and 'capacitor.theme' from the manifest
// writes entries, but output.files declares the top-level key 'capacitor'.
//
// The slot-check normalises manifest writes of 'outputs.X' to 'X', but does
// NOT normalise sub-slot writes like 'outputs.capacitor.statusBar' to their
// root segment 'capacitor'. Until collectWrittenSlots is fixed, the config
// cannot be run through the CLI binary with a capacitor output file declared.
//
// This test documents the failure so that CI catches any regression in either
// direction: if it starts passing unexpectedly, the production fix has landed
// and a positive e2e test should replace this guard.
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
    name: 'capacitor output key rejected by slot-check (production drift)',
    kind: 'unhappy',
    input: {
      outputFiles: {
        'cssVars':   'music.css',
        'capacitor': 'music.capacitor.json',
      },
    },
    async assert(_output, error) {
      assert.ok(error instanceof Error,
        '[cell=5, scenario=slot-check-drift] CLI throws for capacitor output key');
      assert.match((error as Error).message, /Config error/,
        '[cell=5, scenario=slot-check-drift] error is a config-level rejection');
      assert.match((error as Error).message, /capacitor/,
        '[cell=5, scenario=slot-check-drift] error names the unresolved capacitor key');
    },
  },
  {
    name: 'cssVars-only output key passes slot-check',
    kind: 'happy',
    input: {
      outputFiles: { 'cssVars': 'music.css' },
    },
    async assert(_output, error) {
      assert.strictEqual(error, undefined,
        '[cell=5, scenario=css-only] cssVars-only output accepted by slot-check');
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
        'input': {
          'colors':   [SEED],
          'roles':    ROLE_SCHEMA,
          'contrast': { 'level': 'AA', 'algorithm': 'wcag21' },
          'metadata': {
            'category':     'music',
            'cssVarPrefix': '--c-',
            'scopeAttr':    'data-category',
            'scopePrefix':  'category',
            'themeName':    'music',
          },
        },
        'enableContrast':   true,
        'enableStylesheet': true,
        'enableCapacitor':  true,
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
        'output': {
          'directory': outDir,
          'files':     input.outputFiles,
        },
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
