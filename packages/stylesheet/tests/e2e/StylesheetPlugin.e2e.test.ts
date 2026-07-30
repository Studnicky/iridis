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

import type { InputInterface, RoleSchemaInterfaceType } from '@studnicky/iridis';
import type { JsonObjectType } from '@studnicky/types';

import { stylesheetPlugin }            from '@studnicky/iridis-stylesheet';
import { Engine }                      from '@studnicky/iridis/engine';
import { coreTasks }                   from '@studnicky/iridis/tasks';
import assert                          from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { test }                        from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { CssVarsScenarioOutputEntity } from '../entities/CssVarsScenarioOutputEntity.ts';
import { CssVarsScopedScenarioOutputEntity } from '../entities/CssVarsScopedScenarioOutputEntity.ts';
import { CssVarsWideGamutScenarioOutputEntity } from '../entities/CssVarsWideGamutScenarioOutputEntity.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class StylesheetTestFixture {
  static freshEngine(): Engine {
    const engine = new Engine();
    for (const t of coreTasks) {engine.tasks.register(t);}
    engine.adopt(stylesheetPlugin);
    return engine;
  }

  static cssVarsPipeline(extra: readonly string[] = []): readonly string[] {
    return ['intake:hex', 'resolve:roles', ...extra, 'emit:cssVars'];
  }

  static cssVarsScopedPipeline(extra: readonly string[] = []): readonly string[] {
    return ['intake:hex', 'resolve:roles', ...extra, 'emit:cssVarsScoped'];
  }
}

class StylesheetScenarioOutput {
  static cssVars(cssVars: JsonObjectType[string]): CssVarsScenarioOutputEntity.Type {
    const output = { 'cssVars': cssVars };
    if (!CssVarsScenarioOutputEntity.validate(output)) {
      throw new Error('outputs.stylesheet:cssVars is invalid');
    }
    return output;
  }

  static cssVarsWideGamut(
    cssVars: JsonObjectType[string],
    displayP3: JsonObjectType[string]
  ): CssVarsWideGamutScenarioOutputEntity.Type {
    const output = displayP3 === undefined
      ? { 'cssVars': cssVars }
      : { 'cssVars': cssVars, 'displayP3': displayP3 };
    if (!CssVarsWideGamutScenarioOutputEntity.validate(output)) {
      throw new Error('outputs.stylesheet:cssVars wide-gamut result is invalid');
    }
    return output;
  }

  static scoped(scoped: JsonObjectType[string]): CssVarsScopedScenarioOutputEntity.Type {
    const output = { 'scoped': scoped };
    if (!CssVarsScopedScenarioOutputEntity.validate(output)) {
      throw new Error('outputs.stylesheet:cssVarsScoped is invalid');
    }
    return output;
  }
}

// Single-role schema — minimal baseline
const SINGLE_ROLE: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description': undefined,
  'name': 'single',
  'roles': [{ 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'primary', 'required': true }]
};

// Two-role schema — covers a real-world "foreground + background" pair
const TWO_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description': undefined,
  'name': 'two',
  'roles': [
    { 'chromaRange': undefined,   'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'primary', 'required': true },
    { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'secondary', 'required': false }
  ]
};

// All-intent schema — exercises every forcedColorsToken branch
const ALL_INTENT_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description': undefined,
  'name': 'all-intent',
  'roles': [
    { 'chromaRange': undefined,        'derivedFrom': undefined,  'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': undefined, 'name': 'bg', 'required': true },
    { 'chromaRange': undefined,        'derivedFrom': undefined,  'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text', 'lightnessRange': undefined, 'name': 'fg', 'required': true       },
    { 'chromaRange': undefined,       'derivedFrom': undefined,  'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': undefined, 'name': 'acc', 'required': true     },
    { 'chromaRange': undefined,     'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': undefined, 'name': 'muted', 'required': false      },
    { 'chromaRange': undefined,  'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'critical', 'lightnessRange': undefined, 'name': 'critical', 'required': false   },
    { 'chromaRange': undefined,  'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'positive', 'lightnessRange': undefined, 'name': 'positive', 'required': false   },
    { 'chromaRange': undefined,       'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'link', 'lightnessRange': undefined, 'name': 'lnk', 'required': false       },
    { 'chromaRange': undefined,       'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'button', 'lightnessRange': undefined, 'name': 'btn', 'required': false     },
    { 'chromaRange': undefined,     'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'onAccent', 'lightnessRange': undefined, 'name': 'onAcc', 'required': false   },
    { 'chromaRange': undefined,     'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'onButton', 'lightnessRange': undefined, 'name': 'onBtn', 'required': false   }
  ]
};

// Wide-gamut role — permissive chroma so resolve:roles doesn't shrink the OKLCH
const WIDE_GAMUT_ROLE: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description': undefined,
  'name': 'wide-gamut',
  'roles': [
    {
      'chromaRange':     [0.00, 0.50],
      'derivedFrom': undefined,
      'description': undefined,
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent':          'accent',
      'lightnessRange':  [0.05, 0.95],
      'name':            'primary',
      'required':        true
    }
  ]
};

// CamelCase role name — exercises CssVarName.from kebab conversion
const CAMEL_ROLE: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description': undefined,
  'name': 'camel',
  'roles': [
    { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'primaryText', 'required': true },
    { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'onBackground', 'required': true }
  ]
};

// ---------------------------------------------------------------------------
// Cell 1 — plugin shape
//
// StylesheetPlugin must satisfy PluginInterface: a singleton with a stable
// name, version, and a tasks() method returning exactly the two emit tasks.
// Unhappy: structurally impossible here (plugin is a concrete class, no
// invalid input space); noted below.
// ---------------------------------------------------------------------------

type PluginShapeInput = true;
type PluginShapeOutput = {
  readonly 'name':                 string;
  readonly 'satisfiesPluginShape': boolean;
  readonly 'taskNames':            readonly string[];
  readonly 'version':              string;
};

const pluginShapeScenarios: readonly ScenarioInterface<PluginShapeInput, PluginShapeOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=singleton] no throw');
      assert.strictEqual(output!.satisfiesPluginShape, true,        '[cell=1, scenario=singleton] satisfies PluginInterface shape');
      assert.strictEqual(output!.name,                 'stylesheet', '[cell=1, scenario=singleton] name is stylesheet');
      assert.strictEqual(output!.version,              '0.1.0',     '[cell=1, scenario=singleton] version is 0.1.0');
    },
    'input': true,
    'kind': 'happy',
    'name': 'singleton satisfies the plugin shape with stable name and version'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-names] no throw');
      assert.deepStrictEqual(
        [...output!.taskNames].sort(),
        ['emit:cssVars', 'emit:cssVarsScoped'],
        '[cell=1, scenario=task-names] exactly two emit tasks returned'
      );
    },
    'input': true,
    'kind': 'happy',
    'name': 'tasks() returns exactly emit:cssVars and emit:cssVarsScoped'
  }
  // unhappy: structurally impossible — plugin is a sealed singleton; no
  // invalid input exists for tasks() or shape inspection.
];

await new ScenarioRunner<PluginShapeInput, PluginShapeOutput>(
  'StylesheetPlugin :: cell-1 :: plugin-shape',
  (_input) => {
    return {
      'name':                 stylesheetPlugin.name,
      'satisfiesPluginShape': typeof stylesheetPlugin.tasks === 'function'
        && typeof stylesheetPlugin.schemas === 'function'
        && typeof stylesheetPlugin.name === 'string'
        && typeof stylesheetPlugin.version === 'string',
      'taskNames':            stylesheetPlugin.tasks().map((t) => { const result = t.name; return result; }),
      'version':              stylesheetPlugin.version
    };
  }
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

interface CssVarsBasicInputInterface {
  readonly 'colors': InputInterface['colors'];
  readonly 'metadata'?: InputInterface['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':  RoleSchemaInterfaceType;
}
const cssVarsBasicScenarios: readonly ScenarioInterface<CssVarsBasicInputInterface, CssVarsScenarioOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=single-role] no throw');
      const cv = output!.cssVars;
      assert.ok(cv.rootBlock.startsWith(':root {'), '[cell=2, scenario=single-role] rootBlock opens :root');
      assert.match(cv.rootBlock, /--c-primary:\s+#[0-9a-f]{6};/,
        '[cell=2, scenario=single-role] --c-primary declared in rootBlock');
      assert.strictEqual(Object.keys(cv.map).length, 1,
        '[cell=2, scenario=single-role] map has one entry');
      assert.strictEqual(cv.map.primary, '--c-primary',
        '[cell=2, scenario=single-role] map entry is --c-primary');
      assert.ok(cv.full.includes(':root {'),
        '[cell=2, scenario=single-role] full contains :root block');
    },
    'input': {
      'colors':   ['#5b21b6'],
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    SINGLE_ROLE
    },
    'kind': 'happy',
    'name': 'single-role palette writes :root block and map'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=two-roles] no throw');
      const cv = output!.cssVars;
      assert.match(cv.rootBlock, /--c-primary:\s+#[0-9a-f]{6};/,
        '[cell=2, scenario=two-roles] primary var declared');
      assert.match(cv.rootBlock, /--c-secondary:\s+#[0-9a-f]{6};/,
        '[cell=2, scenario=two-roles] secondary var declared');
      assert.strictEqual(Object.keys(cv.map).length, 2,
        '[cell=2, scenario=two-roles] map has two entries');
      assert.strictEqual(cv.map.primary,   '--c-primary',   '[cell=2, scenario=two-roles] primary mapped');
      assert.strictEqual(cv.map.secondary, '--c-secondary', '[cell=2, scenario=two-roles] secondary mapped');
    },
    'input': {
      'colors':   ['#5b21b6', '#c4b5fd'],
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    TWO_ROLES
    },
    'kind': 'happy',
    'name': 'two-role palette writes one var per role and complete map'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=all-roles] no throw');
      const cv = output!.cssVars;
      const expectedRoles = ALL_INTENT_ROLES.roles.map((r) => { const result = r.name; return result; });
      for (const roleName of expectedRoles) {
        const varSuffix = roleName.replace(/[A-Z]/g, (m) => { const result = `-${m.toLowerCase()}`; return result; });
        assert.ok(roleName in cv.map,
          `[cell=2, scenario=all-roles] map contains role '${roleName}'`);
        assert.ok(cv.rootBlock.includes(`--c-${varSuffix}:`),
          `[cell=2, scenario=all-roles] rootBlock declares --c-${varSuffix}`);
      }
    },
    'input': {
      'colors':   ['#1a1a2e', '#e0e0e0', '#7b2d8b', '#888', '#b00020', '#388e3c', '#0066cc', '#1976d2', '#ffffff', '#fff9c4'],
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    ALL_INTENT_ROLES
    },
    'kind': 'happy',
    'name': 'all-intent roles produce one var per role'
  },
  {
    'assert': function(output, error) {
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
    'input': {
      'colors':   ['#000000'],
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    SINGLE_ROLE
    },
    'kind': 'edge',
    'name': 'output shape has all required fields even with single-role palette'
  }
];

await new ScenarioRunner<CssVarsBasicInputInterface, CssVarsScenarioOutputEntity.Type>(
  'StylesheetPlugin :: cell-2 :: emit:cssVars.basic',
  (input) => {
    const engine = StylesheetTestFixture.freshEngine();
    engine.pipeline(input.pipeline);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  input.metadata,
      'roles':     input.roles,
      'runtime':   undefined
    });
    return StylesheetScenarioOutput.cssVars(state.outputs['stylesheet:cssVars']);
  }
).run(cssVarsBasicScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — emit:cssVars cascade structure and forced-colors intent mapping
//
// The emitted `full` string must follow the cascade order:
//   :root (sRGB) → @media prefers-color-scheme:dark → @supports P3 → @media forced-colors
// The forced-colors block must map each intent to the correct system token.
// Dark-scheme block appears only when derive:variant produces a 'dark' variant.
// ---------------------------------------------------------------------------

interface CssVarsCascadeInputInterface {
  readonly 'colors':    InputInterface['colors'];
  readonly 'metadata'?: InputInterface['metadata'];
  readonly 'pipeline':  readonly string[];
  readonly 'roles':     RoleSchemaInterfaceType;
}
const FORCED_TOKENS = new Map<string, string>([
  ['accent',     'Highlight'],
  ['background', 'Canvas'],
  ['button',     'ButtonFace'],
  ['critical',   'CanvasText'],
  ['link',       'LinkText'],
  ['muted',      'GrayText'],
  ['onAccent',   'HighlightText'],
  ['onButton',   'ButtonText'],
  ['positive',   'CanvasText'],
  ['text',       'CanvasText']
]);

const cssVarsCascadeScenarios: readonly ScenarioInterface<CssVarsCascadeInputInterface, CssVarsScenarioOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=forced-colors-present] no throw');
      assert.match(output!.cssVars.forcedColors, /@media \(forced-colors: active\)/,
        '[cell=3, scenario=forced-colors-present] forced-colors block present');
      assert.match(output!.cssVars.forcedColors, /:root/,
        '[cell=3, scenario=forced-colors-present] forced-colors wraps :root');
    },
    'input': {
      'colors':   ['#5b21b6'],
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    SINGLE_ROLE
    },
    'kind': 'happy',
    'name': 'forcedColors block always emitted and contains @media (forced-colors: active)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=all-intents] no throw');
      const fc = output!.cssVars.forcedColors;
      for (const role of ALL_INTENT_ROLES.roles) {
        const varSuffix    = role.name.replace(/[A-Z]/g, (match) => { const result = `-${match.toLowerCase()}`; return result; });
        const expectedToken = FORCED_TOKENS.get(role.intent ?? '') ?? 'CanvasText';
        assert.ok(
          fc.includes(`--c-${varSuffix}: ${expectedToken};`),
          `[cell=3, scenario=all-intents] role '${role.name}' (intent=${role.intent}) maps to ${expectedToken}`
        );
      }
    },
    'input': {
      'colors':   ['#1a1a2e', '#e0e0e0', '#7b2d8b', '#888', '#b00020', '#388e3c', '#0066cc', '#1976d2', '#ffffff', '#fff9c4'],
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    ALL_INTENT_ROLES
    },
    'kind': 'happy',
    'name': 'all intent types map to correct forced-colors system tokens'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=text-not-canvas] no throw');
      const fc = output!.cssVars.forcedColors;
      assert.doesNotMatch(fc, /--c-text:\s+Canvas;/,
        '[cell=3, scenario=text-not-canvas] text role must NOT map to Canvas (legibility regression guard)');
      assert.match(fc, /--c-text:\s+CanvasText;/,
        '[cell=3, scenario=text-not-canvas] text role maps to CanvasText');
    },
    'input': {
      'colors':   ['#1a1a2e', '#e0e0e0'],
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    {
        'contrastPairs': undefined,
        'description': undefined,
        'name': 'text-bg',
        'roles': [
          { 'chromaRange': undefined,   'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': undefined, 'name': 'bg', 'required': true },
          { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text', 'lightnessRange': undefined, 'name': 'text', 'required': true }
        ]
      }
    },
    'kind': 'happy',
    'name': 'text-intent role maps to CanvasText (not Canvas) in forced-colors'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=no-intent-fallback] no throw');
      assert.match(output!.cssVars.forcedColors, /--c-primary:\s+CanvasText;/,
        '[cell=3, scenario=no-intent-fallback] undeclared intent falls to CanvasText');
    },
    'input': {
      'colors':   ['#5b21b6'],
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    SINGLE_ROLE    // no intent declared
    },
    'kind': 'edge',
    'name': 'role without intent declaration falls safe to CanvasText in forced-colors'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=no-dark-scheme] no throw');
      assert.strictEqual(output!.cssVars.darkScheme, '',
        '[cell=3, scenario=no-dark-scheme] darkScheme empty without derive:variant');
      assert.ok(!output!.cssVars.full.includes('@media (prefers-color-scheme: dark)'),
        '[cell=3, scenario=no-dark-scheme] full contains no dark-scheme media query');
    },
    'input': {
      'colors':   ['#5b21b6'],
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),  // no derive:variant
      'roles':    SINGLE_ROLE
    },
    'kind': 'edge',
    'name': 'dark-scheme block absent when derive:variant not in pipeline'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=dark-scheme-present] no throw');
      assert.match(output!.cssVars.darkScheme, /@media \(prefers-color-scheme: dark\)/,
        '[cell=3, scenario=dark-scheme-present] darkScheme has media query');
      assert.match(output!.cssVars.darkScheme, /:root/,
        '[cell=3, scenario=dark-scheme-present] darkScheme wraps :root');
    },
    'input': {
      'colors':   ['#5b21b6', '#c4b5fd'],
      'pipeline': StylesheetTestFixture.cssVarsPipeline(['derive:variant']),
      'roles':    TWO_ROLES
    },
    'kind': 'happy',
    'name': 'dark-scheme block present and wraps :root when derive:variant in pipeline'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=cascade-order] no throw');
      const full = output!.cssVars.full;
      const rootIndex      = full.indexOf(':root');
      const supportsIndex  = full.indexOf('@supports');
      const forcedIndex    = full.indexOf('@media (forced-colors');
      assert.ok(rootIndex >= 0,     '[cell=3, scenario=cascade-order] :root present in full');
      assert.ok(supportsIndex >= 0, '[cell=3, scenario=cascade-order] @supports present in full');
      assert.ok(forcedIndex >= 0,   '[cell=3, scenario=cascade-order] @media forced-colors present in full');
      assert.ok(rootIndex < supportsIndex,
        '[cell=3, scenario=cascade-order] :root precedes @supports');
      assert.ok(supportsIndex < forcedIndex,
        '[cell=3, scenario=cascade-order] @supports precedes @media forced-colors');
    },
    'input': {
      'colors':   [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
      'pipeline': ['intake:oklch', 'resolve:roles', 'emit:cssVars'],
      'roles':    WIDE_GAMUT_ROLE
    },
    'kind': 'happy',
    'name': 'cascade order in full: :root precedes @supports precedes @media forced-colors'
  }
];

await new ScenarioRunner<CssVarsCascadeInputInterface, CssVarsScenarioOutputEntity.Type>(
  'StylesheetPlugin :: cell-3 :: emit:cssVars.cascade',
  (input) => {
    const engine = StylesheetTestFixture.freshEngine();
    engine.pipeline(input.pipeline);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  input.metadata,
      'roles':     input.roles,
      'runtime':   undefined
    });
    return StylesheetScenarioOutput.cssVars(state.outputs['stylesheet:cssVars']);
  }
).run(cssVarsCascadeScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — emit:cssVars custom-property naming
//
// The CSS var prefix is driven by state.metadata.cssVarPrefix (defaults to
// '--c-'). CamelCase role names must be kebab-cased in the CSS output. The
// scopedBlock uses [data-theme='<themeName>'] by default, or
// [<scopeAttr>='<themeName>'] when scopeAttr is set.
// ---------------------------------------------------------------------------

interface CssVarsNamingInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'metadata': InputInterface['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType;
}
const cssVarsNamingScenarios: readonly ScenarioInterface<CssVarsNamingInputInterface, CssVarsScenarioOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=default-prefix] no throw');
      assert.match(output!.cssVars.rootBlock, /--c-primary:/,
        '[cell=4, scenario=default-prefix] default --c- prefix used');
    },
    'input': {
      'colors':   ['#5b21b6'],
      'metadata': {},
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    SINGLE_ROLE
    },
    'kind': 'happy',
    'name': 'default --c- prefix applied to role vars'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=custom-prefix] no throw');
      assert.match(output!.cssVars.rootBlock, /--brand-primary:/,
        '[cell=4, scenario=custom-prefix] --brand- prefix used in rootBlock');
      assert.ok(!output!.cssVars.rootBlock.includes('--c-primary'),
        '[cell=4, scenario=custom-prefix] default --c- prefix absent');
      assert.strictEqual(output!.cssVars.map.primary, '--brand-primary',
        '[cell=4, scenario=custom-prefix] map reflects custom prefix');
    },
    'input': {
      'colors':   ['#5b21b6'],
      'metadata': { 'cssVarPrefix': '--brand-' },
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    SINGLE_ROLE
    },
    'kind': 'happy',
    'name': 'custom cssVarPrefix overrides default --c- prefix'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=camel-kebab] no throw');
      assert.match(output!.cssVars.rootBlock, /--c-primary-text:/,
        '[cell=4, scenario=camel-kebab] primaryText → --c-primary-text');
      assert.match(output!.cssVars.rootBlock, /--c-on-background:/,
        '[cell=4, scenario=camel-kebab] onBackground → --c-on-background');
      assert.strictEqual(output!.cssVars.map.primaryText,   '--c-primary-text',
        '[cell=4, scenario=camel-kebab] map entry kebab-cased for primaryText');
      assert.strictEqual(output!.cssVars.map.onBackground,  '--c-on-background',
        '[cell=4, scenario=camel-kebab] map entry kebab-cased for onBackground');
    },
    'input': {
      'colors':   ['#5b21b6', '#c4b5fd'],
      'metadata': {},
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    CAMEL_ROLE
    },
    'kind': 'edge',
    'name': 'camelCase role names are kebab-cased in emitted vars'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=scoped-default] no throw');
      assert.match(output!.cssVars.scopedBlock, /\[data-theme='default'\]/,
        "[cell=4, scenario=scoped-default] default scopedBlock uses [data-theme='default']");
    },
    'input': {
      'colors':   ['#5b21b6'],
      'metadata': {},
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    SINGLE_ROLE
    },
    'kind': 'happy',
    'name': 'scopedBlock uses data-theme selector by default'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=scoped-attr] no throw');
      assert.match(output!.cssVars.scopedBlock, /\[data-scheme='light'\]/,
        "[cell=4, scenario=scoped-attr] scopedBlock uses custom [data-scheme='light']");
    },
    'input': {
      'colors':   ['#5b21b6'],
      'metadata': { 'scopeAttr': 'data-scheme', 'themeName': 'light' },
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    SINGLE_ROLE
    },
    'kind': 'happy',
    'name': 'scopeAttr metadata changes the scoped attribute name'
  }
];

await new ScenarioRunner<CssVarsNamingInputInterface, CssVarsScenarioOutputEntity.Type>(
  'StylesheetPlugin :: cell-4 :: emit:cssVars.naming',
  (input) => {
    const engine = StylesheetTestFixture.freshEngine();
    engine.pipeline(input.pipeline);
    const runInput: InputInterface = {
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  input.metadata,
      'roles':     input.roles,
      'runtime':   undefined
    };
    const state = engine.run(runInput);
    return StylesheetScenarioOutput.cssVars(state.outputs['stylesheet:cssVars']);
  }
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

interface CssVarsWideGamutInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'metadata'?: InputInterface['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType;
}
const cssVarsWideGamutScenarios: readonly ScenarioInterface<CssVarsWideGamutInputInterface, CssVarsWideGamutScenarioOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=srgb-only] no throw');
      assert.strictEqual(output!.cssVars.wideGamut, '',
        '[cell=5, scenario=srgb-only] wideGamut is empty string for sRGB-only input');
      assert.ok(!output!.cssVars.full.includes('@supports'),
        '[cell=5, scenario=srgb-only] full contains no @supports block');
      assert.ok(!output!.cssVars.full.includes('display-p3'),
        '[cell=5, scenario=srgb-only] full contains no display-p3 syntax');
    },
    'input': {
      'colors':   ['#5b21b6'],
      'pipeline': StylesheetTestFixture.cssVarsPipeline(),
      'roles':    SINGLE_ROLE
    },
    'kind': 'happy',
    'name': 'sRGB-only input produces empty wideGamut and no @supports in full'
  },
  {
    'assert': function(output, error) {
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
    'input': {
      // l=0.7, c=0.4, h=30 — vivid red-orange, well outside sRGB
      'colors':   [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
      'pipeline': ['intake:oklch', 'resolve:roles', 'emit:cssVars'],
      'roles':    WIDE_GAMUT_ROLE
    },
    'kind': 'happy',
    'name': 'out-of-sRGB OKLCH populates displayP3 and emits @supports wideGamut block'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=intake-p3] no throw');
      const cv = output!.cssVars;
      assert.ok(cv.wideGamut.length > 0,
        '[cell=5, scenario=intake-p3] wideGamut block emitted');
      assert.ok(
        cv.wideGamut.includes('color(display-p3 0.9900 0.4200 0.1800)'),
        `[cell=5, scenario=intake-p3] P3 value serialized at 4dp, got:\n${cv.wideGamut}`
      );
    },
    'input': {
      'colors':   ['color(display-p3 0.99 0.42 0.18)'],
      'pipeline': ['intake:p3', 'resolve:roles', 'emit:cssVars'],
      'roles':    WIDE_GAMUT_ROLE
    },
    'kind': 'happy',
    'name': 'intake:p3 string input preserves displayP3 at 4dp precision'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=supports-wrapper] no throw');
      assert.match(output!.cssVars.wideGamut, /^@supports/,
        '[cell=5, scenario=supports-wrapper] wideGamut string opens with @supports');
      assert.match(output!.cssVars.wideGamut, /:root \{/,
        '[cell=5, scenario=supports-wrapper] @supports block contains :root block');
    },
    'input': {
      'colors':   [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
      'pipeline': ['intake:oklch', 'resolve:roles', 'emit:cssVars'],
      'roles':    WIDE_GAMUT_ROLE
    },
    'kind': 'edge',
    'name': 'wideGamut block emitted inside @supports query wrapper'
  }
];

await new ScenarioRunner<CssVarsWideGamutInputInterface, CssVarsWideGamutScenarioOutputEntity.Type>(
  'StylesheetPlugin :: cell-5 :: emit:cssVars.wide-gamut',
  (input) => {
    const engine = StylesheetTestFixture.freshEngine();
    engine.pipeline(input.pipeline);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  input.metadata,
      'roles':     input.roles,
      'runtime':   undefined
    });
    const displayP3 = state.roles.primary?.displayP3;
    return StylesheetScenarioOutput.cssVarsWideGamut(state.outputs['stylesheet:cssVars'], displayP3);
  }
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

interface CssVarsScopedBasicInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'metadata'?: InputInterface['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType;
}
const cssVarsScopedBasicScenarios: readonly ScenarioInterface<CssVarsScopedBasicInputInterface, CssVarsScopedScenarioOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=single-role-scoped] no throw');
      const sc = output!.scoped;
      assert.ok('default' in sc.blocks, '[cell=6, scenario=single-role-scoped] blocks has default key');
      assert.match(sc.blocks.default, /\[data-theme='default'\]/,
        "[cell=6, scenario=single-role-scoped] default block uses [data-theme='default'] selector");
      assert.match(sc.blocks.default, /--c-primary:\s+#[0-9a-f]{6};/,
        '[cell=6, scenario=single-role-scoped] primary var declared in default block');
      assert.deepStrictEqual(sc.wideGamut, {},
        '[cell=6, scenario=single-role-scoped] wideGamut empty for sRGB-only input');
      assert.ok(sc.full.includes("[data-theme='default']"),
        '[cell=6, scenario=single-role-scoped] full includes default block');
    },
    'input': {
      'colors':   ['#5b21b6'],
      'metadata': {},
      'pipeline': StylesheetTestFixture.cssVarsScopedPipeline(),
      'roles':    SINGLE_ROLE
    },
    'kind': 'happy',
    'name': 'single-role sRGB palette writes default block with [data-theme] selector'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=two-roles-scoped] no throw');
      const block = output!.scoped.blocks.default!;
      assert.match(block, /--c-primary:\s+#[0-9a-f]{6};/,
        '[cell=6, scenario=two-roles-scoped] primary var in default block');
      assert.match(block, /--c-secondary:\s+#[0-9a-f]{6};/,
        '[cell=6, scenario=two-roles-scoped] secondary var in default block');
    },
    'input': {
      'colors':   ['#5b21b6', '#c4b5fd'],
      'metadata': {},
      'pipeline': StylesheetTestFixture.cssVarsScopedPipeline(),
      'roles':    TWO_ROLES
    },
    'kind': 'happy',
    'name': 'two-role sRGB palette declares both vars in default block'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=output-shape-scoped] no throw');
      const sc = output!.scoped;
      assert.ok(typeof sc.blocks    === 'object', '[cell=6, scenario=output-shape-scoped] blocks is object');
      assert.ok(typeof sc.wideGamut === 'object', '[cell=6, scenario=output-shape-scoped] wideGamut is object');
      assert.ok(typeof sc.full      === 'string', '[cell=6, scenario=output-shape-scoped] full is string');
    },
    'input': {
      'colors':   ['#000000'],
      'pipeline': StylesheetTestFixture.cssVarsScopedPipeline(),
      'roles':    SINGLE_ROLE
    },
    'kind': 'edge',
    'name': 'output shape has blocks, wideGamut, and full fields'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=no-supports-srgb] no throw');
      assert.ok(!output!.scoped.full.includes('@supports'),
        '[cell=6, scenario=no-supports-srgb] full contains no @supports for sRGB-only');
      assert.ok(!output!.scoped.full.includes('display-p3'),
        '[cell=6, scenario=no-supports-srgb] full contains no display-p3 for sRGB-only');
    },
    'input': {
      'colors':   ['#5b21b6', '#c4b5fd'],
      'pipeline': StylesheetTestFixture.cssVarsScopedPipeline(),
      'roles':    TWO_ROLES
    },
    'kind': 'edge',
    'name': 'sRGB-only input produces no @supports and no display-p3 in full'
  }
];

await new ScenarioRunner<CssVarsScopedBasicInputInterface, CssVarsScopedScenarioOutputEntity.Type>(
  'StylesheetPlugin :: cell-6 :: emit:cssVarsScoped.basic',
  (input) => {
    const engine = StylesheetTestFixture.freshEngine();
    engine.pipeline(input.pipeline);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  input.metadata,
      'roles':     input.roles,
      'runtime':   undefined
    });
    return StylesheetScenarioOutput.scoped(state.outputs['stylesheet:cssVarsScoped']);
  }
).run(cssVarsScopedBasicScenarios);

// ---------------------------------------------------------------------------
// Cell 7 — emit:cssVarsScoped variants
//
// When derive:variant is in the pipeline, a 'dark' variant appears in
// state.variants. emit:cssVarsScoped must emit a scoped block for each variant
// key in addition to 'default'. The full string must include all blocks in
// order: default sRGB, [dark sRGB, ...].
// ---------------------------------------------------------------------------

interface CssVarsScopedVariantsInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'metadata'?: InputInterface['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType;
}
const cssVarsScopedVariantsScenarios: readonly ScenarioInterface<CssVarsScopedVariantsInputInterface, CssVarsScopedScenarioOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=dark-variant] no throw');
      const sc = output!.scoped;
      assert.ok('dark' in sc.blocks, '[cell=7, scenario=dark-variant] blocks has dark key');
      assert.match(sc.blocks.dark, /\[data-theme='dark'\]/,
        "[cell=7, scenario=dark-variant] dark block uses [data-theme='dark'] selector");
      assert.ok(sc.full.includes("[data-theme='dark']"),
        '[cell=7, scenario=dark-variant] full includes dark block');
    },
    'input': {
      'colors':   ['#5b21b6', '#c4b5fd'],
      'metadata': {},
      'pipeline': StylesheetTestFixture.cssVarsScopedPipeline(['derive:variant']),
      'roles':    TWO_ROLES
    },
    'kind': 'happy',
    'name': 'derive:variant produces dark block under [data-theme=\'dark\'] selector'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=block-order] no throw');
      const full = output!.scoped.full;
      const defaultIndex = full.indexOf("[data-theme='default']");
      const darkIndex    = full.indexOf("[data-theme='dark']");
      assert.ok(defaultIndex >= 0, '[cell=7, scenario=block-order] default block present in full');
      assert.ok(darkIndex >= 0,    '[cell=7, scenario=block-order] dark block present in full');
      assert.ok(defaultIndex < darkIndex,
        '[cell=7, scenario=block-order] default block precedes dark block in full');
    },
    'input': {
      'colors':   ['#5b21b6', '#c4b5fd'],
      'metadata': {},
      'pipeline': StylesheetTestFixture.cssVarsScopedPipeline(['derive:variant']),
      'roles':    TWO_ROLES
    },
    'kind': 'happy',
    'name': 'default block appears before dark block in full'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=no-variants] no throw');
      const sc = output!.scoped;
      assert.deepStrictEqual(Object.keys(sc.blocks), ['default'],
        '[cell=7, scenario=no-variants] only default block when no variants');
    },
    'input': {
      'colors':   ['#5b21b6'],
      'pipeline': StylesheetTestFixture.cssVarsScopedPipeline(),  // no derive:variant
      'roles':    SINGLE_ROLE
    },
    'kind': 'edge',
    'name': 'no derive:variant means only default block in blocks'
  }
];

await new ScenarioRunner<CssVarsScopedVariantsInputInterface, CssVarsScopedScenarioOutputEntity.Type>(
  'StylesheetPlugin :: cell-7 :: emit:cssVarsScoped.variants',
  (input) => {
    const engine = StylesheetTestFixture.freshEngine();
    engine.pipeline(input.pipeline);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  input.metadata,
      'roles':     input.roles,
      'runtime':   undefined
    });
    return StylesheetScenarioOutput.scoped(state.outputs['stylesheet:cssVarsScoped']);
  }
).run(cssVarsScopedVariantsScenarios);

// ---------------------------------------------------------------------------
// Cell 8 — emit:cssVarsScoped wide-gamut @supports per-category
//
// When a role carries displayP3, emit:cssVarsScoped must emit a sibling
// @supports block scoped under the same [data-<scopePrefix>='<category>']
// selector. The @supports block appears after the sRGB block for the same
// category in the full string. Categories with no P3 records emit no sibling.
// ---------------------------------------------------------------------------

interface CssVarsScopedWideGamutInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'metadata'?: InputInterface['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType;
}
const cssVarsScopedWideGamutScenarios: readonly ScenarioInterface<CssVarsScopedWideGamutInputInterface, CssVarsScopedScenarioOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=8, scenario=oklch-scoped-p3] no throw');
      const sc = output!.scoped;
      assert.ok('default' in sc.wideGamut,
        '[cell=8, scenario=oklch-scoped-p3] wideGamut has default entry');
      const defaultP3 = sc.wideGamut.default;
      assert.match(defaultP3, /@supports \(color: color\(display-p3 0 0 0\)\)/,
        '[cell=8, scenario=oklch-scoped-p3] wideGamut block opens with @supports query');
      assert.match(defaultP3, /\[data-iridis='default'\]/,
        "[cell=8, scenario=oklch-scoped-p3] P3 block scoped under [data-iridis='default']");
      assert.match(defaultP3, /--c-primary:\s+color\(display-p3 [\d.]+ [\d.]+ [\d.]+\);/,
        '[cell=8, scenario=oklch-scoped-p3] P3 value declared under the scoped selector');
    },
    'input': {
      'colors':   [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
      'metadata': { 'scopePrefix': 'iridis' },
      'pipeline': ['intake:oklch', 'resolve:roles', 'emit:cssVarsScoped'],
      'roles':    WIDE_GAMUT_ROLE
    },
    'kind': 'happy',
    'name': 'out-of-sRGB OKLCH emits @supports sibling for default category'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=8, scenario=scoped-cascade-order] no throw');
      const full = output!.scoped.full;
      const sRgbIndex     = full.indexOf("[data-iridis='default'] {");
      const supportsIndex = full.indexOf('@supports (color: color(display-p3 0 0 0))');
      assert.ok(sRgbIndex >= 0,     '[cell=8, scenario=scoped-cascade-order] sRGB scoped block present');
      assert.ok(supportsIndex >= 0, '[cell=8, scenario=scoped-cascade-order] @supports block present');
      assert.ok(sRgbIndex < supportsIndex,
        '[cell=8, scenario=scoped-cascade-order] sRGB scoped block precedes @supports sibling');
    },
    'input': {
      'colors':   [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
      'metadata': { 'scopePrefix': 'iridis' },
      'pipeline': ['intake:oklch', 'resolve:roles', 'emit:cssVarsScoped'],
      'roles':    WIDE_GAMUT_ROLE
    },
    'kind': 'happy',
    'name': 'sRGB scoped block precedes its @supports sibling in full'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=8, scenario=srgb-no-supports-scoped] no throw');
      assert.deepStrictEqual(output!.scoped.wideGamut, {},
        '[cell=8, scenario=srgb-no-supports-scoped] wideGamut is empty object for sRGB-only');
      assert.ok(!output!.scoped.full.includes('@supports'),
        '[cell=8, scenario=srgb-no-supports-scoped] full has no @supports for sRGB-only');
    },
    'input': {
      'colors':   ['#5b21b6'],
      'pipeline': StylesheetTestFixture.cssVarsScopedPipeline(),
      'roles':    SINGLE_ROLE
    },
    'kind': 'edge',
    'name': 'sRGB-only input has empty wideGamut map and no @supports in full'
  }
];

await new ScenarioRunner<CssVarsScopedWideGamutInputInterface, CssVarsScopedScenarioOutputEntity.Type>(
  'StylesheetPlugin :: cell-8 :: emit:cssVarsScoped.wide-gamut',
  (input) => {
    const engine = StylesheetTestFixture.freshEngine();
    engine.pipeline(input.pipeline);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  input.metadata,
      'roles':     input.roles,
      'runtime':   undefined
    });
    return StylesheetScenarioOutput.scoped(state.outputs['stylesheet:cssVarsScoped']);
  }
).run(cssVarsScopedWideGamutScenarios);

// ---------------------------------------------------------------------------
// Cell 9 — emit:cssVarsScoped custom scopePrefix
//
// state.metadata.scopePrefix overrides the default 'theme' string used to
// build [data-<scopePrefix>='<category>'] selectors. The override must
// propagate into both blocks and wideGamut entries.
// ---------------------------------------------------------------------------

interface CssVarsScopedPrefixInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'metadata': InputInterface['metadata'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType;
}
const cssVarsScopedPrefixScenarios: readonly ScenarioInterface<CssVarsScopedPrefixInputInterface, CssVarsScopedScenarioOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=default-scope-prefix] no throw');
      assert.match(output!.scoped.blocks.default!, /\[data-theme='default'\]/,
        "[cell=9, scenario=default-scope-prefix] default scopePrefix is 'theme'");
    },
    'input': {
      'colors':   ['#5b21b6'],
      'metadata': {},
      'pipeline': StylesheetTestFixture.cssVarsScopedPipeline(),
      'roles':    SINGLE_ROLE
    },
    'kind': 'happy',
    'name': 'default scopePrefix is theme when metadata absent'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=custom-scope-prefix] no throw');
      assert.match(output!.scoped.blocks.default!, /\[data-app-palette='default'\]/,
        '[cell=9, scenario=custom-scope-prefix] custom scopePrefix used in blocks selector');
      assert.ok(!output!.scoped.full.includes('[data-theme='),
        '[cell=9, scenario=custom-scope-prefix] default theme prefix absent from full');
    },
    'input': {
      'colors':   ['#5b21b6', '#c4b5fd'],
      'metadata': { 'scopePrefix': 'app-palette' },
      'pipeline': StylesheetTestFixture.cssVarsScopedPipeline(),
      'roles':    TWO_ROLES
    },
    'kind': 'happy',
    'name': 'custom scopePrefix replaces theme in selectors'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=prefix-variants] no throw');
      assert.match(output!.scoped.blocks.dark!, /\[data-myapp='dark'\]/,
        '[cell=9, scenario=prefix-variants] dark variant block uses custom scopePrefix');
    },
    'input': {
      'colors':   ['#5b21b6', '#c4b5fd'],
      'metadata': { 'scopePrefix': 'myapp' },
      'pipeline': StylesheetTestFixture.cssVarsScopedPipeline(['derive:variant']),
      'roles':    TWO_ROLES
    },
    'kind': 'happy',
    'name': 'custom scopePrefix propagates into variant blocks'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=prefix-p3] no throw');
      assert.ok('default' in output!.scoped.wideGamut,
        '[cell=9, scenario=prefix-p3] wideGamut has default entry');
      assert.match(output!.scoped.wideGamut.default, /\[data-custom-scope='default'\]/,
        "[cell=9, scenario=prefix-p3] P3 @supports block scoped under [data-custom-scope='default']");
    },
    'input': {
      'colors':   [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
      'metadata': { 'scopePrefix': 'custom-scope' },
      'pipeline': ['intake:oklch', 'resolve:roles', 'emit:cssVarsScoped'],
      'roles':    WIDE_GAMUT_ROLE
    },
    'kind': 'edge',
    'name': 'scopePrefix with P3 input propagates into wideGamut @supports block'
  }
];

await new ScenarioRunner<CssVarsScopedPrefixInputInterface, CssVarsScopedScenarioOutputEntity.Type>(
  'StylesheetPlugin :: cell-9 :: emit:cssVarsScoped.scope-prefix',
  (input) => {
    const engine = StylesheetTestFixture.freshEngine();
    engine.pipeline(input.pipeline);
    const runInput: InputInterface = {
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  input.metadata,
      'roles':     input.roles,
      'runtime':   undefined
    };
    const state = engine.run(runInput);
    return StylesheetScenarioOutput.scoped(state.outputs['stylesheet:cssVarsScoped']);
  }
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
  import.meta.url
);

const GOLDEN_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'foreground', 'minRatio': 4.5 }
  ],
  'description': undefined,
  'name':  'golden-cssvars',
  'roles': [
    { 'chromaRange': [0.00, 0.03], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.05, 0.15], 'name': 'background', 'required': true },
    { 'chromaRange': [0.00, 0.03], 'derivedFrom': undefined, 'description': undefined,       'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text', 'lightnessRange': [0.90, 0.99], 'name': 'foreground', 'required': true },
    { 'chromaRange': [0.15, 0.25],     'derivedFrom': undefined, 'description': undefined,     'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': [0.55, 0.70], 'name': 'accent', 'required': true }
  ]
};

await test('emit:cssVars :: golden :: stable seed + role schema matches locked CSS fixture', () => {
  const engine = StylesheetTestFixture.freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'enforce:contrast',
    'emit:cssVars'
  ]);

  const state = engine.run({
    'bypass':    undefined,
    'colors':    ['#5b21b6', '#0f172a', '#f8fafc'],
    'contrast':  undefined,
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  undefined,
    'roles':     GOLDEN_ROLES,
    'runtime':   undefined
  });

  const out = StylesheetScenarioOutput.cssVars(state.outputs['stylesheet:cssVars']).cssVars;
  const actual = `${out.full}\n`;

  // Requirement-level assertions (independent of the golden fixture).
  // These assert the spec's mandatory output structure so the golden can't
  // silently lock in a regression: even a freshly regenerated golden must
  // satisfy these explicit requirements.

  // 1. :root block declares one CSS variable per role.
  const declarationsByProperty = new Map<string, string>();
  const rootBlockLines = out.rootBlock.split('\n');
  const rootBlockLineCount = rootBlockLines.length;
  for (let lineIndex = 0; lineIndex < rootBlockLineCount; lineIndex++) {
    const line = rootBlockLines[lineIndex] ?? '';
    const separatorIndex = line.indexOf(':');
    if (separatorIndex >= 0) {
      declarationsByProperty.set(line.slice(0, separatorIndex).trim(), line);
    }
  }
  for (const role of GOLDEN_ROLES.roles) {
    const declaration = declarationsByProperty.get(`--c-${role.name}`);
    assert.match(declaration ?? '', /#[0-9a-fA-F]{6};/,
      `:root must declare --c-${role.name} as a hex value`);
  }

  // 2. forced-colors block exists and maps each role's CSS var to a system
  //    token derived from the schema's intent declaration.
  assert.match(out.forcedColors, /@media \(forced-colors: active\)/,
    'forced-colors block must be a (forced-colors: active) media query');

  const FORCED_BY_INTENT: Readonly<Record<string, string>> = {
    'accent':     'Highlight',
    'background': 'Canvas',
    'button':     'ButtonFace',
    'critical':   'CanvasText',
    'link':       'LinkText',
    'muted':      'GrayText',
    'onAccent':   'HighlightText',
    'onButton':   'ButtonText',
    'positive':   'CanvasText',
    'text':       'CanvasText'
  };

  for (const role of GOLDEN_ROLES.roles) {
    const expectedToken = role.intent !== undefined
      ? FORCED_BY_INTENT[role.intent]
      : 'CanvasText';
    assert.ok(expectedToken !== undefined,
      `test setup: GOLDEN_ROLES role '${role.name}' uses intent '${role.intent}' which lacks a FORCED_BY_INTENT mapping in this test`);
    assert.ok(
      out.forcedColors.includes(`--c-${role.name}: ${expectedToken};`),
      `forced-colors must map --c-${role.name} (intent='${role.intent}') to ${expectedToken}`
    );
  }

  // 3. Specifically: the 'foreground' role (intent='text') must NOT collapse
  //    to Canvas (the historic substring-match regression that motivated R1.2).
  assert.doesNotMatch(out.forcedColors, /--c-foreground:\s+Canvas;/,
    'foreground role must NOT map to Canvas under forced-colors; that would make text invisible');
  assert.match(out.forcedColors, /--c-foreground:\s+CanvasText;/,
    'foreground role with intent=text must map to CanvasText');

  if (process.env.UPDATE_GOLDENS === '1') {
    writeFileSync(CSS_VARS_GOLDEN, actual);
  }

  const expected = readFileSync(CSS_VARS_GOLDEN, 'utf8');
  assert.strictEqual(
    actual,
    expected,
    'emit:cssVars output drifted from the golden fixture; regenerate with UPDATE_GOLDENS=1 if intentional'
  );
});
