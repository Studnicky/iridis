/**
 * StylesheetPlugin e2e — scenario-matrix suite.
 *
 * Subject: `StylesheetPlugin` (plugin shape) + `emit:cssVars` + `emit:cssVarsScoped`
 * (CSS generation tasks). Each cell covers one concern; scenarios within each
 * cell exhaust the happy / edge / unhappy matrix for that concern.
 *
 * Cells:
 *   1. plugin-shape      — singleton identity, task manifest
 *   2. emit:cssVars basic — :root block, map, empty/single/all-roles palette
 *   3. emit:cssVars cascade — dark-scheme, forced-colors, wide-gamut @supports ordering
 *   4. emit:cssVars custom-property naming — prefix override, camelCase role names
 *   5. emit:cssVars wide-gamut — OKLCH out-of-sRGB, intake:p3, sRGB-only (no @supports)
 *   6. emit:cssVarsScoped basic — default category, scopePrefix default, sRGB-only
 *   7. emit:cssVarsScoped variants — dark variant blocks, multi-variant ordering
 *   8. emit:cssVarsScoped wide-gamut — P3 sibling emitted per category, sRGB-only has none
 *   9. emit:cssVarsScoped custom prefix — scopePrefix metadata override
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { test }                        from 'node:test';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

import { Engine }                                   from '@studnicky/iridis/engine';
import { coreTasks }                                from '@studnicky/iridis/tasks';
import type { InputInterface, RoleSchemaInterface } from '@studnicky/iridis';
import { stylesheetPlugin, StylesheetPlugin }       from '@studnicky/iridis-stylesheet';
import type {
  CssVarsOutputInterface,
  CssVarsScopedOutputInterface,
} from '@studnicky/iridis-stylesheet/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  engine.adopt(stylesheetPlugin);
  return engine;
}

function cssVarsPipeline(extra: readonly string[] = []): readonly string[] {
  return ['intake:hex', 'resolve:roles', ...extra, 'emit:cssVars'];
}

function cssVarsScopedPipeline(extra: readonly string[] = []): readonly string[] {
  return ['intake:hex', 'resolve:roles', ...extra, 'emit:cssVarsScoped'];
}

// Single-role schema — minimal baseline
const SINGLE_ROLE: RoleSchemaInterface = {
  'name': 'single',
  'roles': [{ 'name': 'primary', 'required': true }],
};

// Two-role schema — covers a real-world "foreground + background" pair
const TWO_ROLES: RoleSchemaInterface = {
  'name': 'two',
  'roles': [
    { 'name': 'primary',   'required': true },
    { 'name': 'secondary', 'required': false },
  ],
};

// All-intent schema — exercises every forcedColorsToken branch
const ALL_INTENT_ROLES: RoleSchemaInterface = {
  'name': 'all-intent',
  'roles': [
    { 'name': 'bg',        'required': true,  'intent': 'background' },
    { 'name': 'fg',        'required': true,  'intent': 'text'       },
    { 'name': 'acc',       'required': true,  'intent': 'accent'     },
    { 'name': 'muted',     'required': false, 'intent': 'muted'      },
    { 'name': 'critical',  'required': false, 'intent': 'critical'   },
    { 'name': 'positive',  'required': false, 'intent': 'positive'   },
    { 'name': 'lnk',       'required': false, 'intent': 'link'       },
    { 'name': 'btn',       'required': false, 'intent': 'button'     },
    { 'name': 'onAcc',     'required': false, 'intent': 'onAccent'   },
    { 'name': 'onBtn',     'required': false, 'intent': 'onButton'   },
  ],
};

// Wide-gamut role — permissive chroma so resolve:roles doesn't shrink the OKLCH
const WIDE_GAMUT_ROLE: RoleSchemaInterface = {
  'name': 'wide-gamut',
  'roles': [
    {
      'name':            'primary',
      'required':        true,
      'intent':          'accent',
      'lightnessRange':  [0.05, 0.95],
      'chromaRange':     [0.00, 0.50],
    },
  ],
};

// CamelCase role name — exercises toCssVarName kebab conversion
const CAMEL_ROLE: RoleSchemaInterface = {
  'name': 'camel',
  'roles': [
    { 'name': 'primaryText', 'required': true },
    { 'name': 'onBackground', 'required': true },
  ],
};

// ---------------------------------------------------------------------------
// Cell 1 — plugin shape
//
// StylesheetPlugin must satisfy PluginInterface: a singleton with a stable
// name, version, and a tasks() method returning exactly the two emit tasks.
// Unhappy: structurally impossible here (plugin is a concrete class, no
// invalid input space); noted below.
// ---------------------------------------------------------------------------

interface PluginShapeInput  { readonly run: true }
interface PluginShapeOutput {
  readonly isInstance:   boolean;
  readonly name:         string;
  readonly version:      string;
  readonly taskNames:    readonly string[];
}

const pluginShapeScenarios: readonly ScenarioInterface<PluginShapeInput, PluginShapeOutput>[] = [
  {
    name: 'singleton is an instance of StylesheetPlugin with stable name and version',
    kind: 'happy',
    input: { run: true },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=singleton] no throw');
      assert.strictEqual(output!.isInstance, true,        '[cell=1, scenario=singleton] instanceof StylesheetPlugin');
      assert.strictEqual(output!.name,       'stylesheet', '[cell=1, scenario=singleton] name is stylesheet');
      assert.strictEqual(output!.version,    '0.1.0',     '[cell=1, scenario=singleton] version is 0.1.0');
    },
  },
  {
    name: 'tasks() returns exactly emit:cssVars and emit:cssVarsScoped',
    kind: 'happy',
    input: { run: true },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-names] no throw');
      assert.deepStrictEqual(
        [...output!.taskNames].sort(),
        ['emit:cssVars', 'emit:cssVarsScoped'],
        '[cell=1, scenario=task-names] exactly two emit tasks returned',
      );
    },
  },
  // unhappy: structurally impossible — plugin is a sealed singleton; no
  // invalid input exists for tasks() or shape inspection.
];

new ScenarioRunner<PluginShapeInput, PluginShapeOutput>(
  'StylesheetPlugin :: cell-1 :: plugin-shape',
  (_input) => {
    return {
      isInstance:  stylesheetPlugin instanceof StylesheetPlugin,
      name:        stylesheetPlugin.name,
      version:     stylesheetPlugin.version,
      taskNames:   stylesheetPlugin.tasks().map((t) => t.name),
    };
  },
).run(pluginShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — emit:cssVars basic output shape
//
// emit:cssVars must write to state.outputs.cssVars. The output must contain:
//   - rootBlock: :root { ... } with one CSS var per role
//   - map: role-name → CSS var name
//   - full: concatenation of blocks
//   - forcedColors: @media (forced-colors: active) block always present
// Edge: empty palette (no roles resolved) and single-role palette.
// ---------------------------------------------------------------------------

interface CssVarsBasicInput {
  readonly colors: InputInterface['colors'];
  readonly roles:  RoleSchemaInterface;
  readonly pipeline: readonly string[];
  readonly metadata?: InputInterface['metadata'];
}
interface CssVarsBasicOutput {
  readonly cssVars: CssVarsOutputInterface;
}

const cssVarsBasicScenarios: readonly ScenarioInterface<CssVarsBasicInput, CssVarsBasicOutput>[] = [
  {
    name: 'single-role palette writes :root block and map',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsPipeline(),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=single-role] no throw');
      const cv = output!.cssVars;
      assert.ok(cv.rootBlock.startsWith(':root {'), '[cell=2, scenario=single-role] rootBlock opens :root');
      assert.match(cv.rootBlock, /--c-primary:\s+#[0-9a-f]{6};/,
        '[cell=2, scenario=single-role] --c-primary declared in rootBlock');
      assert.strictEqual(Object.keys(cv.map).length, 1,
        '[cell=2, scenario=single-role] map has one entry');
      assert.strictEqual(cv.map['primary'], '--c-primary',
        '[cell=2, scenario=single-role] map entry is --c-primary');
      assert.ok(cv.full.includes(':root {'),
        '[cell=2, scenario=single-role] full contains :root block');
    },
  },
  {
    name: 'two-role palette writes one var per role and complete map',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#c4b5fd'],
      roles:    TWO_ROLES,
      pipeline: cssVarsPipeline(),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=two-roles] no throw');
      const cv = output!.cssVars;
      assert.match(cv.rootBlock, /--c-primary:\s+#[0-9a-f]{6};/,
        '[cell=2, scenario=two-roles] primary var declared');
      assert.match(cv.rootBlock, /--c-secondary:\s+#[0-9a-f]{6};/,
        '[cell=2, scenario=two-roles] secondary var declared');
      assert.strictEqual(Object.keys(cv.map).length, 2,
        '[cell=2, scenario=two-roles] map has two entries');
      assert.strictEqual(cv.map['primary'],   '--c-primary',   '[cell=2, scenario=two-roles] primary mapped');
      assert.strictEqual(cv.map['secondary'], '--c-secondary', '[cell=2, scenario=two-roles] secondary mapped');
    },
  },
  {
    name: 'all-intent roles produce one var per role',
    kind: 'happy',
    input: {
      colors:   ['#1a1a2e', '#e0e0e0', '#7b2d8b', '#888', '#b00020', '#388e3c', '#0066cc', '#1976d2', '#ffffff', '#fff9c4'],
      roles:    ALL_INTENT_ROLES,
      pipeline: cssVarsPipeline(),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=all-roles] no throw');
      const cv = output!.cssVars;
      const expectedRoles = ALL_INTENT_ROLES.roles.map((r) => r.name);
      for (const roleName of expectedRoles) {
        const varSuffix = roleName.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
        assert.ok(roleName in cv.map,
          `[cell=2, scenario=all-roles] map contains role '${roleName}'`);
        assert.match(cv.rootBlock, new RegExp(`--c-${varSuffix}:`),
          `[cell=2, scenario=all-roles] rootBlock declares --c-${varSuffix}`);
      }
    },
  },
  {
    name: 'output shape has all required fields even with single-role palette',
    kind: 'edge',
    input: {
      colors:   ['#000000'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsPipeline(),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=output-shape] no throw');
      const cv = output!.cssVars;
      assert.ok(typeof cv.rootBlock    === 'string', '[cell=2, scenario=output-shape] rootBlock is string');
      assert.ok(typeof cv.scopedBlock  === 'string', '[cell=2, scenario=output-shape] scopedBlock is string');
      assert.ok(typeof cv.darkScheme   === 'string', '[cell=2, scenario=output-shape] darkScheme is string');
      assert.ok(typeof cv.forcedColors === 'string', '[cell=2, scenario=output-shape] forcedColors is string');
      assert.ok(typeof cv.wideGamut    === 'string', '[cell=2, scenario=output-shape] wideGamut is string');
      assert.ok(typeof cv.full         === 'string', '[cell=2, scenario=output-shape] full is string');
      assert.ok(typeof cv.map          === 'object', '[cell=2, scenario=output-shape] map is object');
    },
  },
];

new ScenarioRunner<CssVarsBasicInput, CssVarsBasicOutput>(
  'StylesheetPlugin :: cell-2 :: emit:cssVars.basic',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run({
      'colors':   input.colors,
      'roles':    input.roles,
      ...(input.metadata !== undefined ? { 'metadata': input.metadata } : {}),
    });
    const cssVars = state.outputs['stylesheet:cssVars'] as CssVarsOutputInterface | undefined;
    if (!cssVars) throw new Error('outputs.stylesheet:cssVars not set');
    return { cssVars };
  },
).run(cssVarsBasicScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — emit:cssVars cascade structure and forced-colors intent mapping
//
// The emitted `full` string must follow the cascade order:
//   :root (sRGB) → @media prefers-color-scheme:dark → @supports P3 → @media forced-colors
// The forced-colors block must map each intent to the correct system token.
// Dark-scheme block appears only when derive:variant produces a 'dark' variant.
// ---------------------------------------------------------------------------

interface CssVarsCascadeInput {
  readonly colors:    InputInterface['colors'];
  readonly roles:     RoleSchemaInterface;
  readonly pipeline:  readonly string[];
  readonly metadata?: InputInterface['metadata'];
}
interface CssVarsCascadeOutput {
  readonly cssVars: CssVarsOutputInterface;
}

const FORCED_TOKENS: Readonly<Record<string, string>> = {
  'text':       'CanvasText',
  'background': 'Canvas',
  'accent':     'Highlight',
  'muted':      'GrayText',
  'critical':   'CanvasText',
  'positive':   'CanvasText',
  'link':       'LinkText',
  'button':     'ButtonFace',
  'onAccent':   'HighlightText',
  'onButton':   'ButtonText',
};

const cssVarsCascadeScenarios: readonly ScenarioInterface<CssVarsCascadeInput, CssVarsCascadeOutput>[] = [
  {
    name: 'forcedColors block always emitted and contains @media (forced-colors: active)',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsPipeline(),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=forced-colors-present] no throw');
      assert.match(output!.cssVars.forcedColors, /@media \(forced-colors: active\)/,
        '[cell=3, scenario=forced-colors-present] forced-colors block present');
      assert.match(output!.cssVars.forcedColors, /:root/,
        '[cell=3, scenario=forced-colors-present] forced-colors wraps :root');
    },
  },
  {
    name: 'all intent types map to correct forced-colors system tokens',
    kind: 'happy',
    input: {
      colors:   ['#1a1a2e', '#e0e0e0', '#7b2d8b', '#888', '#b00020', '#388e3c', '#0066cc', '#1976d2', '#ffffff', '#fff9c4'],
      roles:    ALL_INTENT_ROLES,
      pipeline: cssVarsPipeline(),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=all-intents] no throw');
      const fc = output!.cssVars.forcedColors;
      for (const role of ALL_INTENT_ROLES.roles) {
        const varSuffix    = role.name.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
        const expectedToken = FORCED_TOKENS[role.intent ?? ''] ?? 'CanvasText';
        assert.match(
          fc,
          new RegExp(`--c-${varSuffix}:\\s+${expectedToken};`),
          `[cell=3, scenario=all-intents] role '${role.name}' (intent=${role.intent}) maps to ${expectedToken}`,
        );
      }
    },
  },
  {
    name: 'text-intent role maps to CanvasText (not Canvas) in forced-colors',
    kind: 'happy',
    input: {
      colors:   ['#1a1a2e', '#e0e0e0'],
      roles:    {
        'name': 'text-bg',
        'roles': [
          { 'name': 'bg',   'required': true, 'intent': 'background' },
          { 'name': 'text', 'required': true, 'intent': 'text' },
        ],
      },
      pipeline: cssVarsPipeline(),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=text-not-canvas] no throw');
      const fc = output!.cssVars.forcedColors;
      assert.doesNotMatch(fc, /--c-text:\s+Canvas;/,
        '[cell=3, scenario=text-not-canvas] text role must NOT map to Canvas (legibility regression guard)');
      assert.match(fc, /--c-text:\s+CanvasText;/,
        '[cell=3, scenario=text-not-canvas] text role maps to CanvasText');
    },
  },
  {
    name: 'role without intent declaration falls safe to CanvasText in forced-colors',
    kind: 'edge',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,    // no intent declared
      pipeline: cssVarsPipeline(),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=no-intent-fallback] no throw');
      assert.match(output!.cssVars.forcedColors, /--c-primary:\s+CanvasText;/,
        '[cell=3, scenario=no-intent-fallback] undeclared intent falls to CanvasText');
    },
  },
  {
    name: 'dark-scheme block absent when derive:variant not in pipeline',
    kind: 'edge',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsPipeline(),  // no derive:variant
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=no-dark-scheme] no throw');
      assert.strictEqual(output!.cssVars.darkScheme, '',
        '[cell=3, scenario=no-dark-scheme] darkScheme empty without derive:variant');
      assert.ok(!output!.cssVars.full.includes('@media (prefers-color-scheme: dark)'),
        '[cell=3, scenario=no-dark-scheme] full contains no dark-scheme media query');
    },
  },
  {
    name: 'dark-scheme block present and wraps :root when derive:variant in pipeline',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#c4b5fd'],
      roles:    TWO_ROLES,
      pipeline: cssVarsPipeline(['derive:variant']),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=dark-scheme-present] no throw');
      assert.match(output!.cssVars.darkScheme, /@media \(prefers-color-scheme: dark\)/,
        '[cell=3, scenario=dark-scheme-present] darkScheme has media query');
      assert.match(output!.cssVars.darkScheme, /:root/,
        '[cell=3, scenario=dark-scheme-present] darkScheme wraps :root');
    },
  },
  {
    name: 'cascade order in full: :root precedes @supports precedes @media forced-colors',
    kind: 'happy',
    input: {
      colors:   [{ 'l': 0.7, 'c': 0.4, 'h': 30 }],
      roles:    WIDE_GAMUT_ROLE,
      pipeline: ['intake:oklch', 'resolve:roles', 'emit:cssVars'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=cascade-order] no throw');
      const full = output!.cssVars.full;
      const rootIdx      = full.indexOf(':root');
      const supportsIdx  = full.indexOf('@supports');
      const forcedIdx    = full.indexOf('@media (forced-colors');
      assert.ok(rootIdx >= 0,     '[cell=3, scenario=cascade-order] :root present in full');
      assert.ok(supportsIdx >= 0, '[cell=3, scenario=cascade-order] @supports present in full');
      assert.ok(forcedIdx >= 0,   '[cell=3, scenario=cascade-order] @media forced-colors present in full');
      assert.ok(rootIdx < supportsIdx,
        '[cell=3, scenario=cascade-order] :root precedes @supports');
      assert.ok(supportsIdx < forcedIdx,
        '[cell=3, scenario=cascade-order] @supports precedes @media forced-colors');
    },
  },
];

new ScenarioRunner<CssVarsCascadeInput, CssVarsCascadeOutput>(
  'StylesheetPlugin :: cell-3 :: emit:cssVars.cascade',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run({
      'colors':   input.colors,
      'roles':    input.roles,
      ...(input.metadata !== undefined ? { 'metadata': input.metadata } : {}),
    });
    const cssVars = state.outputs['stylesheet:cssVars'] as CssVarsOutputInterface | undefined;
    if (!cssVars) throw new Error('outputs.stylesheet:cssVars not set');
    return { cssVars };
  },
).run(cssVarsCascadeScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — emit:cssVars custom-property naming
//
// The CSS var prefix is driven by state.metadata.cssVarPrefix (defaults to
// '--c-'). CamelCase role names must be kebab-cased in the CSS output. The
// scopedBlock uses [data-theme='<themeName>'] by default, or
// [<scopeAttr>='<themeName>'] when scopeAttr is set.
// ---------------------------------------------------------------------------

interface CssVarsNamingInput {
  readonly colors:   InputInterface['colors'];
  readonly roles:    RoleSchemaInterface;
  readonly pipeline: readonly string[];
  readonly metadata: InputInterface['metadata'];
}
interface CssVarsNamingOutput {
  readonly cssVars: CssVarsOutputInterface;
}

const cssVarsNamingScenarios: readonly ScenarioInterface<CssVarsNamingInput, CssVarsNamingOutput>[] = [
  {
    name: 'default --c- prefix applied to role vars',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsPipeline(),
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=default-prefix] no throw');
      assert.match(output!.cssVars.rootBlock, /--c-primary:/,
        '[cell=4, scenario=default-prefix] default --c- prefix used');
    },
  },
  {
    name: 'custom cssVarPrefix overrides default --c- prefix',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsPipeline(),
      metadata: { 'cssVarPrefix': '--brand-' },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=custom-prefix] no throw');
      assert.match(output!.cssVars.rootBlock, /--brand-primary:/,
        '[cell=4, scenario=custom-prefix] --brand- prefix used in rootBlock');
      assert.ok(!output!.cssVars.rootBlock.includes('--c-primary'),
        '[cell=4, scenario=custom-prefix] default --c- prefix absent');
      assert.strictEqual(output!.cssVars.map['primary'], '--brand-primary',
        '[cell=4, scenario=custom-prefix] map reflects custom prefix');
    },
  },
  {
    name: 'camelCase role names are kebab-cased in emitted vars',
    kind: 'edge',
    input: {
      colors:   ['#5b21b6', '#c4b5fd'],
      roles:    CAMEL_ROLE,
      pipeline: cssVarsPipeline(),
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=camel-kebab] no throw');
      assert.match(output!.cssVars.rootBlock, /--c-primary-text:/,
        '[cell=4, scenario=camel-kebab] primaryText → --c-primary-text');
      assert.match(output!.cssVars.rootBlock, /--c-on-background:/,
        '[cell=4, scenario=camel-kebab] onBackground → --c-on-background');
      assert.strictEqual(output!.cssVars.map['primaryText'],   '--c-primary-text',
        '[cell=4, scenario=camel-kebab] map entry kebab-cased for primaryText');
      assert.strictEqual(output!.cssVars.map['onBackground'],  '--c-on-background',
        '[cell=4, scenario=camel-kebab] map entry kebab-cased for onBackground');
    },
  },
  {
    name: 'scopedBlock uses data-theme selector by default',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsPipeline(),
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=scoped-default] no throw');
      assert.match(output!.cssVars.scopedBlock, /\[data-theme='default'\]/,
        "[cell=4, scenario=scoped-default] default scopedBlock uses [data-theme='default']");
    },
  },
  {
    name: 'scopeAttr metadata changes the scoped attribute name',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsPipeline(),
      metadata: { 'scopeAttr': 'data-scheme', 'themeName': 'light' },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=scoped-attr] no throw');
      assert.match(output!.cssVars.scopedBlock, /\[data-scheme='light'\]/,
        "[cell=4, scenario=scoped-attr] scopedBlock uses custom [data-scheme='light']");
    },
  },
];

new ScenarioRunner<CssVarsNamingInput, CssVarsNamingOutput>(
  'StylesheetPlugin :: cell-4 :: emit:cssVars.naming',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline);
    const runInput: InputInterface = {
      'colors': input.colors,
      'roles':  input.roles,
      ...(input.metadata !== undefined ? { 'metadata': input.metadata } : {}),
    };
    const state = await engine.run(runInput);
    const cssVars = state.outputs['stylesheet:cssVars'] as CssVarsOutputInterface | undefined;
    if (!cssVars) throw new Error('outputs.stylesheet:cssVars not set');
    return { cssVars };
  },
).run(cssVarsNamingScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — emit:cssVars wide-gamut OKLCH / P3 fallback chains
//
// When the input color lies outside sRGB gamut:
//   - state.roles[role].displayP3 is populated
//   - rootBlock carries the gamut-mapped sRGB hex
//   - wideGamut block wraps @supports and declares the P3 color
//   - full cascade includes rootBlock before @supports
// When the input is within sRGB:
//   - wideGamut is an empty string
//   - full contains no @supports or display-p3 text
// intake:p3 path: displayP3 carried verbatim at 4dp precision.
// ---------------------------------------------------------------------------

interface CssVarsWideGamutInput {
  readonly colors:   InputInterface['colors'];
  readonly roles:    RoleSchemaInterface;
  readonly pipeline: readonly string[];
  readonly metadata?: InputInterface['metadata'];
}
interface CssVarsWideGamutOutput {
  readonly cssVars: CssVarsOutputInterface;
  readonly displayP3?: { r: number; g: number; b: number } | undefined;
}

const cssVarsWideGamutScenarios: readonly ScenarioInterface<CssVarsWideGamutInput, CssVarsWideGamutOutput>[] = [
  {
    name: 'sRGB-only input produces empty wideGamut and no @supports in full',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsPipeline(),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=srgb-only] no throw');
      assert.strictEqual(output!.cssVars.wideGamut, '',
        '[cell=5, scenario=srgb-only] wideGamut is empty string for sRGB-only input');
      assert.ok(!output!.cssVars.full.includes('@supports'),
        '[cell=5, scenario=srgb-only] full contains no @supports block');
      assert.ok(!output!.cssVars.full.includes('display-p3'),
        '[cell=5, scenario=srgb-only] full contains no display-p3 syntax');
    },
  },
  {
    name: 'out-of-sRGB OKLCH populates displayP3 and emits @supports wideGamut block',
    kind: 'happy',
    input: {
      // l=0.7, c=0.4, h=30 — vivid red-orange, well outside sRGB
      colors:   [{ 'l': 0.7, 'c': 0.4, 'h': 30 }],
      roles:    WIDE_GAMUT_ROLE,
      pipeline: ['intake:oklch', 'resolve:roles', 'emit:cssVars'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=oklch-out-of-srgb] no throw');
      const cv = output!.cssVars;
      // sRGB fallback — channels must be clamped into gamut
      assert.match(cv.rootBlock, /--c-primary:\s+#[0-9a-f]{6};/,
        '[cell=5, scenario=oklch-out-of-srgb] rootBlock carries gamut-mapped hex');
      // P3 @supports block
      assert.ok(cv.wideGamut.length > 0,
        '[cell=5, scenario=oklch-out-of-srgb] wideGamut block emitted');
      assert.match(cv.wideGamut, /@supports \(color: color\(display-p3 0 0 0\)\)/,
        '[cell=5, scenario=oklch-out-of-srgb] wideGamut uses P3 feature-detection query');
      assert.match(cv.wideGamut, /--c-primary:\s+color\(display-p3 [\d.]+ [\d.]+ [\d.]+\);/,
        '[cell=5, scenario=oklch-out-of-srgb] wideGamut declares P3 value for --c-primary');
      // displayP3 populated
      assert.ok(output!.displayP3 !== undefined,
        '[cell=5, scenario=oklch-out-of-srgb] displayP3 populated on role record');
    },
  },
  {
    name: 'intake:p3 string input preserves displayP3 at 4dp precision',
    kind: 'happy',
    input: {
      colors:   ['color(display-p3 0.99 0.42 0.18)'],
      roles:    WIDE_GAMUT_ROLE,
      pipeline: ['intake:p3', 'resolve:roles', 'emit:cssVars'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=intake-p3] no throw');
      const cv = output!.cssVars;
      assert.ok(cv.wideGamut.length > 0,
        '[cell=5, scenario=intake-p3] wideGamut block emitted');
      assert.ok(
        cv.wideGamut.includes('color(display-p3 0.9900 0.4200 0.1800)'),
        `[cell=5, scenario=intake-p3] P3 value serialized at 4dp, got:\n${cv.wideGamut}`,
      );
    },
  },
  {
    name: 'wideGamut block emitted inside @supports query wrapper',
    kind: 'edge',
    input: {
      colors:   [{ 'l': 0.7, 'c': 0.4, 'h': 30 }],
      roles:    WIDE_GAMUT_ROLE,
      pipeline: ['intake:oklch', 'resolve:roles', 'emit:cssVars'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=supports-wrapper] no throw');
      assert.match(output!.cssVars.wideGamut, /^@supports/,
        '[cell=5, scenario=supports-wrapper] wideGamut string opens with @supports');
      assert.match(output!.cssVars.wideGamut, /:root \{/,
        '[cell=5, scenario=supports-wrapper] @supports block contains :root block');
    },
  },
];

new ScenarioRunner<CssVarsWideGamutInput, CssVarsWideGamutOutput>(
  'StylesheetPlugin :: cell-5 :: emit:cssVars.wide-gamut',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run({
      'colors': input.colors,
      'roles':  input.roles,
      ...(input.metadata !== undefined ? { 'metadata': input.metadata } : {}),
    });
    const cssVars = state.outputs['stylesheet:cssVars'] as CssVarsOutputInterface | undefined;
    if (!cssVars) throw new Error('outputs.stylesheet:cssVars not set');
    const displayP3 = state.roles['primary']?.displayP3;
    return { cssVars, displayP3 };
  },
).run(cssVarsWideGamutScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — emit:cssVarsScoped basic output shape
//
// emit:cssVarsScoped must write to state.outputs.cssVarsScoped. The output
// must contain:
//   - blocks: { 'default': '[data-<scopePrefix>=\'default\'] { ... }' }
//   - wideGamut: {} when no displayP3 on any role
//   - full: join of all blocks
// The default scopePrefix is 'theme'; state.metadata.scopePrefix overrides it.
// ---------------------------------------------------------------------------

interface CssVarsScopedBasicInput {
  readonly colors:   InputInterface['colors'];
  readonly roles:    RoleSchemaInterface;
  readonly pipeline: readonly string[];
  readonly metadata?: InputInterface['metadata'];
}
interface CssVarsScopedBasicOutput {
  readonly scoped: CssVarsScopedOutputInterface;
}

const cssVarsScopedBasicScenarios: readonly ScenarioInterface<CssVarsScopedBasicInput, CssVarsScopedBasicOutput>[] = [
  {
    name: 'single-role sRGB palette writes default block with [data-theme] selector',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsScopedPipeline(),
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=single-role-scoped] no throw');
      const sc = output!.scoped;
      assert.ok('default' in sc.blocks, '[cell=6, scenario=single-role-scoped] blocks has default key');
      assert.match(sc.blocks['default'] as string, /\[data-theme='default'\]/,
        "[cell=6, scenario=single-role-scoped] default block uses [data-theme='default'] selector");
      assert.match(sc.blocks['default'] as string, /--c-primary:\s+#[0-9a-f]{6};/,
        '[cell=6, scenario=single-role-scoped] primary var declared in default block');
      assert.deepStrictEqual(sc.wideGamut, {},
        '[cell=6, scenario=single-role-scoped] wideGamut empty for sRGB-only input');
      assert.ok(sc.full.includes("[data-theme='default']"),
        '[cell=6, scenario=single-role-scoped] full includes default block');
    },
  },
  {
    name: 'two-role sRGB palette declares both vars in default block',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#c4b5fd'],
      roles:    TWO_ROLES,
      pipeline: cssVarsScopedPipeline(),
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=two-roles-scoped] no throw');
      const block = output!.scoped.blocks['default'] as string;
      assert.match(block, /--c-primary:\s+#[0-9a-f]{6};/,
        '[cell=6, scenario=two-roles-scoped] primary var in default block');
      assert.match(block, /--c-secondary:\s+#[0-9a-f]{6};/,
        '[cell=6, scenario=two-roles-scoped] secondary var in default block');
    },
  },
  {
    name: 'output shape has blocks, wideGamut, and full fields',
    kind: 'edge',
    input: {
      colors:   ['#000000'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsScopedPipeline(),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=output-shape-scoped] no throw');
      const sc = output!.scoped;
      assert.ok(typeof sc.blocks    === 'object', '[cell=6, scenario=output-shape-scoped] blocks is object');
      assert.ok(typeof sc.wideGamut === 'object', '[cell=6, scenario=output-shape-scoped] wideGamut is object');
      assert.ok(typeof sc.full      === 'string', '[cell=6, scenario=output-shape-scoped] full is string');
    },
  },
  {
    name: 'sRGB-only input produces no @supports and no display-p3 in full',
    kind: 'edge',
    input: {
      colors:   ['#5b21b6', '#c4b5fd'],
      roles:    TWO_ROLES,
      pipeline: cssVarsScopedPipeline(),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=no-supports-srgb] no throw');
      assert.ok(!output!.scoped.full.includes('@supports'),
        '[cell=6, scenario=no-supports-srgb] full contains no @supports for sRGB-only');
      assert.ok(!output!.scoped.full.includes('display-p3'),
        '[cell=6, scenario=no-supports-srgb] full contains no display-p3 for sRGB-only');
    },
  },
];

new ScenarioRunner<CssVarsScopedBasicInput, CssVarsScopedBasicOutput>(
  'StylesheetPlugin :: cell-6 :: emit:cssVarsScoped.basic',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run({
      'colors': input.colors,
      'roles':  input.roles,
      ...(input.metadata !== undefined ? { 'metadata': input.metadata } : {}),
    });
    const scoped = state.outputs['stylesheet:cssVarsScoped'] as CssVarsScopedOutputInterface | undefined;
    if (!scoped) throw new Error('outputs.stylesheet:cssVarsScoped not set');
    return { scoped };
  },
).run(cssVarsScopedBasicScenarios);

// ---------------------------------------------------------------------------
// Cell 7 — emit:cssVarsScoped variants
//
// When derive:variant is in the pipeline, a 'dark' variant appears in
// state.variants. emit:cssVarsScoped must emit a scoped block for each variant
// key in addition to 'default'. The full string must include all blocks in
// order: default sRGB, [dark sRGB, ...].
// ---------------------------------------------------------------------------

interface CssVarsScopedVariantsInput {
  readonly colors:   InputInterface['colors'];
  readonly roles:    RoleSchemaInterface;
  readonly pipeline: readonly string[];
  readonly metadata?: InputInterface['metadata'];
}
interface CssVarsScopedVariantsOutput {
  readonly scoped: CssVarsScopedOutputInterface;
}

const cssVarsScopedVariantsScenarios: readonly ScenarioInterface<CssVarsScopedVariantsInput, CssVarsScopedVariantsOutput>[] = [
  {
    name: 'derive:variant produces dark block under [data-theme=\'dark\'] selector',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#c4b5fd'],
      roles:    TWO_ROLES,
      pipeline: cssVarsScopedPipeline(['derive:variant']),
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=dark-variant] no throw');
      const sc = output!.scoped;
      assert.ok('dark' in sc.blocks, '[cell=7, scenario=dark-variant] blocks has dark key');
      assert.match(sc.blocks['dark'] as string, /\[data-theme='dark'\]/,
        "[cell=7, scenario=dark-variant] dark block uses [data-theme='dark'] selector");
      assert.ok(sc.full.includes("[data-theme='dark']"),
        '[cell=7, scenario=dark-variant] full includes dark block');
    },
  },
  {
    name: 'default block appears before dark block in full',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#c4b5fd'],
      roles:    TWO_ROLES,
      pipeline: cssVarsScopedPipeline(['derive:variant']),
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=block-order] no throw');
      const full = output!.scoped.full;
      const defaultIdx = full.indexOf("[data-theme='default']");
      const darkIdx    = full.indexOf("[data-theme='dark']");
      assert.ok(defaultIdx >= 0, '[cell=7, scenario=block-order] default block present in full');
      assert.ok(darkIdx >= 0,    '[cell=7, scenario=block-order] dark block present in full');
      assert.ok(defaultIdx < darkIdx,
        '[cell=7, scenario=block-order] default block precedes dark block in full');
    },
  },
  {
    name: 'no derive:variant means only default block in blocks',
    kind: 'edge',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsScopedPipeline(),  // no derive:variant
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=no-variants] no throw');
      const sc = output!.scoped;
      assert.deepStrictEqual(Object.keys(sc.blocks), ['default'],
        '[cell=7, scenario=no-variants] only default block when no variants');
    },
  },
];

new ScenarioRunner<CssVarsScopedVariantsInput, CssVarsScopedVariantsOutput>(
  'StylesheetPlugin :: cell-7 :: emit:cssVarsScoped.variants',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run({
      'colors': input.colors,
      'roles':  input.roles,
      ...(input.metadata !== undefined ? { 'metadata': input.metadata } : {}),
    });
    const scoped = state.outputs['stylesheet:cssVarsScoped'] as CssVarsScopedOutputInterface | undefined;
    if (!scoped) throw new Error('outputs.stylesheet:cssVarsScoped not set');
    return { scoped };
  },
).run(cssVarsScopedVariantsScenarios);

// ---------------------------------------------------------------------------
// Cell 8 — emit:cssVarsScoped wide-gamut @supports per-category
//
// When a role carries displayP3, emit:cssVarsScoped must emit a sibling
// @supports block scoped under the same [data-<scopePrefix>='<category>']
// selector. The @supports block appears after the sRGB block for the same
// category in the full string. Categories with no P3 records emit no sibling.
// ---------------------------------------------------------------------------

interface CssVarsScopedWideGamutInput {
  readonly colors:   InputInterface['colors'];
  readonly roles:    RoleSchemaInterface;
  readonly pipeline: readonly string[];
  readonly metadata?: InputInterface['metadata'];
}
interface CssVarsScopedWideGamutOutput {
  readonly scoped: CssVarsScopedOutputInterface;
}

const cssVarsScopedWideGamutScenarios: readonly ScenarioInterface<CssVarsScopedWideGamutInput, CssVarsScopedWideGamutOutput>[] = [
  {
    name: 'out-of-sRGB OKLCH emits @supports sibling for default category',
    kind: 'happy',
    input: {
      colors:   [{ 'l': 0.7, 'c': 0.4, 'h': 30 }],
      roles:    WIDE_GAMUT_ROLE,
      pipeline: ['intake:oklch', 'resolve:roles', 'emit:cssVarsScoped'],
      metadata: { 'scopePrefix': 'iridis' },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=8, scenario=oklch-scoped-p3] no throw');
      const sc = output!.scoped;
      assert.ok('default' in sc.wideGamut,
        '[cell=8, scenario=oklch-scoped-p3] wideGamut has default entry');
      const defaultP3 = sc.wideGamut['default'] as string;
      assert.match(defaultP3, /@supports \(color: color\(display-p3 0 0 0\)\)/,
        '[cell=8, scenario=oklch-scoped-p3] wideGamut block opens with @supports query');
      assert.match(defaultP3, /\[data-iridis='default'\]/,
        "[cell=8, scenario=oklch-scoped-p3] P3 block scoped under [data-iridis='default']");
      assert.match(defaultP3, /--c-primary:\s+color\(display-p3 [\d.]+ [\d.]+ [\d.]+\);/,
        '[cell=8, scenario=oklch-scoped-p3] P3 value declared under the scoped selector');
    },
  },
  {
    name: 'sRGB scoped block precedes its @supports sibling in full',
    kind: 'happy',
    input: {
      colors:   [{ 'l': 0.7, 'c': 0.4, 'h': 30 }],
      roles:    WIDE_GAMUT_ROLE,
      pipeline: ['intake:oklch', 'resolve:roles', 'emit:cssVarsScoped'],
      metadata: { 'scopePrefix': 'iridis' },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=8, scenario=scoped-cascade-order] no throw');
      const full = output!.scoped.full;
      const sRgbIdx     = full.indexOf("[data-iridis='default'] {");
      const supportsIdx = full.indexOf('@supports (color: color(display-p3 0 0 0))');
      assert.ok(sRgbIdx >= 0,     '[cell=8, scenario=scoped-cascade-order] sRGB scoped block present');
      assert.ok(supportsIdx >= 0, '[cell=8, scenario=scoped-cascade-order] @supports block present');
      assert.ok(sRgbIdx < supportsIdx,
        '[cell=8, scenario=scoped-cascade-order] sRGB scoped block precedes @supports sibling');
    },
  },
  {
    name: 'sRGB-only input has empty wideGamut map and no @supports in full',
    kind: 'edge',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsScopedPipeline(),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=8, scenario=srgb-no-supports-scoped] no throw');
      assert.deepStrictEqual(output!.scoped.wideGamut, {},
        '[cell=8, scenario=srgb-no-supports-scoped] wideGamut is empty object for sRGB-only');
      assert.ok(!output!.scoped.full.includes('@supports'),
        '[cell=8, scenario=srgb-no-supports-scoped] full has no @supports for sRGB-only');
    },
  },
];

new ScenarioRunner<CssVarsScopedWideGamutInput, CssVarsScopedWideGamutOutput>(
  'StylesheetPlugin :: cell-8 :: emit:cssVarsScoped.wide-gamut',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run({
      'colors': input.colors,
      'roles':  input.roles,
      ...(input.metadata !== undefined ? { 'metadata': input.metadata } : {}),
    });
    const scoped = state.outputs['stylesheet:cssVarsScoped'] as CssVarsScopedOutputInterface | undefined;
    if (!scoped) throw new Error('outputs.stylesheet:cssVarsScoped not set');
    return { scoped };
  },
).run(cssVarsScopedWideGamutScenarios);

// ---------------------------------------------------------------------------
// Cell 9 — emit:cssVarsScoped custom scopePrefix
//
// state.metadata.scopePrefix overrides the default 'theme' string used to
// build [data-<scopePrefix>='<category>'] selectors. The override must
// propagate into both blocks and wideGamut entries.
// ---------------------------------------------------------------------------

interface CssVarsScopedPrefixInput {
  readonly colors:   InputInterface['colors'];
  readonly roles:    RoleSchemaInterface;
  readonly pipeline: readonly string[];
  readonly metadata: InputInterface['metadata'];
}
interface CssVarsScopedPrefixOutput {
  readonly scoped: CssVarsScopedOutputInterface;
}

const cssVarsScopedPrefixScenarios: readonly ScenarioInterface<CssVarsScopedPrefixInput, CssVarsScopedPrefixOutput>[] = [
  {
    name: 'default scopePrefix is theme when metadata absent',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6'],
      roles:    SINGLE_ROLE,
      pipeline: cssVarsScopedPipeline(),
      metadata: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=default-scope-prefix] no throw');
      assert.match(output!.scoped.blocks['default'] as string, /\[data-theme='default'\]/,
        "[cell=9, scenario=default-scope-prefix] default scopePrefix is 'theme'");
    },
  },
  {
    name: 'custom scopePrefix replaces theme in selectors',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#c4b5fd'],
      roles:    TWO_ROLES,
      pipeline: cssVarsScopedPipeline(),
      metadata: { 'scopePrefix': 'app-palette' },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=custom-scope-prefix] no throw');
      assert.match(output!.scoped.blocks['default'] as string, /\[data-app-palette='default'\]/,
        "[cell=9, scenario=custom-scope-prefix] custom scopePrefix used in blocks selector");
      assert.ok(!output!.scoped.full.includes('[data-theme='),
        '[cell=9, scenario=custom-scope-prefix] default theme prefix absent from full');
    },
  },
  {
    name: 'custom scopePrefix propagates into variant blocks',
    kind: 'happy',
    input: {
      colors:   ['#5b21b6', '#c4b5fd'],
      roles:    TWO_ROLES,
      pipeline: cssVarsScopedPipeline(['derive:variant']),
      metadata: { 'scopePrefix': 'myapp' },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=prefix-variants] no throw');
      assert.match(output!.scoped.blocks['dark'] as string, /\[data-myapp='dark'\]/,
        "[cell=9, scenario=prefix-variants] dark variant block uses custom scopePrefix");
    },
  },
  {
    name: 'scopePrefix with P3 input propagates into wideGamut @supports block',
    kind: 'edge',
    input: {
      colors:   [{ 'l': 0.7, 'c': 0.4, 'h': 30 }],
      roles:    WIDE_GAMUT_ROLE,
      pipeline: ['intake:oklch', 'resolve:roles', 'emit:cssVarsScoped'],
      metadata: { 'scopePrefix': 'custom-scope' },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=prefix-p3] no throw');
      assert.ok('default' in output!.scoped.wideGamut,
        '[cell=9, scenario=prefix-p3] wideGamut has default entry');
      assert.match(output!.scoped.wideGamut['default'] as string, /\[data-custom-scope='default'\]/,
        "[cell=9, scenario=prefix-p3] P3 @supports block scoped under [data-custom-scope='default']");
    },
  },
];

new ScenarioRunner<CssVarsScopedPrefixInput, CssVarsScopedPrefixOutput>(
  'StylesheetPlugin :: cell-9 :: emit:cssVarsScoped.scope-prefix',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline);
    const runInput: InputInterface = {
      'colors': input.colors,
      'roles':  input.roles,
      ...(input.metadata !== undefined ? { 'metadata': input.metadata } : {}),
    };
    const state = await engine.run(runInput);
    const scoped = state.outputs['stylesheet:cssVarsScoped'] as CssVarsScopedOutputInterface | undefined;
    if (!scoped) throw new Error('outputs.stylesheet:cssVarsScoped not set');
    return { scoped };
  },
).run(cssVarsScopedPrefixScenarios);

// ---------------------------------------------------------------------------
// Golden fixture: locks the full emit:cssVars output for a stable seed +
// role schema running through intake:hex → resolve:roles → expand:family →
// enforce:contrast → emit:cssVars. Any drift in role math, contrast
// enforcement, or CSS serialisation flips this test. Regenerate via
// UPDATE_GOLDENS=1 after an intentional behaviour change.
// ---------------------------------------------------------------------------

const CSS_VARS_GOLDEN = new URL(
  '../fixtures/emit-cssVars-golden.css',
  import.meta.url,
);

const GOLDEN_ROLES: RoleSchemaInterface = {
  'name':  'golden-cssvars',
  'roles': [
    { 'name': 'background', 'required': true, 'intent': 'background', 'lightnessRange': [0.05, 0.15], 'chromaRange': [0.00, 0.03] },
    { 'name': 'foreground', 'required': true, 'intent': 'text',       'lightnessRange': [0.90, 0.99], 'chromaRange': [0.00, 0.03] },
    { 'name': 'accent',     'required': true, 'intent': 'accent',     'lightnessRange': [0.55, 0.70], 'chromaRange': [0.15, 0.25] },
  ],
  'contrastPairs': [
    { 'foreground': 'foreground', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

test('emit:cssVars :: golden :: stable seed + role schema matches locked CSS fixture', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'enforce:contrast',
    'emit:cssVars',
  ]);

  const state = await engine.run({
    'colors': ['#5b21b6', '#0f172a', '#f8fafc'],
    'roles':  GOLDEN_ROLES,
  });

  const out = state.outputs['stylesheet:cssVars'] as CssVarsOutputInterface | undefined;
  assert.ok(out !== undefined, 'cssVars output present');
  const actual = `${out.full}\n`;

  // Requirement-level assertions (independent of the golden fixture).
  // These assert the spec's mandatory output structure so the golden can't
  // silently lock in a regression: even a freshly regenerated golden must
  // satisfy these explicit requirements.

  // 1. :root block declares one CSS variable per role.
  for (const role of GOLDEN_ROLES.roles) {
    assert.match(
      out.rootBlock,
      new RegExp(`--c-${role.name}:\\s+#[0-9a-fA-F]{6};`),
      `:root must declare --c-${role.name} as a hex value`,
    );
  }

  // 2. forced-colors block exists and maps each role's CSS var to a system
  //    token derived from the schema's intent declaration.
  assert.match(out.forcedColors, /@media \(forced-colors: active\)/,
    'forced-colors block must be a (forced-colors: active) media query');

  const FORCED_BY_INTENT: Readonly<Record<string, string>> = {
    'text':       'CanvasText',
    'background': 'Canvas',
    'accent':     'Highlight',
    'muted':      'GrayText',
    'critical':   'CanvasText',
    'positive':   'CanvasText',
    'link':       'LinkText',
    'button':     'ButtonFace',
    'onAccent':   'HighlightText',
    'onButton':   'ButtonText',
  };

  for (const role of GOLDEN_ROLES.roles) {
    const expectedToken = role.intent !== undefined
      ? FORCED_BY_INTENT[role.intent]
      : 'CanvasText';
    assert.ok(expectedToken !== undefined,
      `test setup: GOLDEN_ROLES role '${role.name}' uses intent '${role.intent}' which lacks a FORCED_BY_INTENT mapping in this test`);
    assert.match(
      out.forcedColors,
      new RegExp(`--c-${role.name}:\\s+${expectedToken};`),
      `forced-colors must map --c-${role.name} (intent='${role.intent}') to ${expectedToken}`,
    );
  }

  // 3. Specifically: the 'foreground' role (intent='text') must NOT collapse
  //    to Canvas (the historic substring-match regression that motivated R1.2).
  assert.doesNotMatch(out.forcedColors, /--c-foreground:\s+Canvas;/,
    'foreground role must NOT map to Canvas under forced-colors; that would make text invisible');
  assert.match(out.forcedColors, /--c-foreground:\s+CanvasText;/,
    'foreground role with intent=text must map to CanvasText');

  if (process.env['UPDATE_GOLDENS'] === '1') {
    writeFileSync(CSS_VARS_GOLDEN, actual);
  }

  const expected = readFileSync(CSS_VARS_GOLDEN, 'utf8');
  assert.strictEqual(
    actual,
    expected,
    'emit:cssVars output drifted from the golden fixture; regenerate with UPDATE_GOLDENS=1 if intentional',
  );
});
