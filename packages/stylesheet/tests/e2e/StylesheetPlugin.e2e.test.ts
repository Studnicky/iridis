/**
 * Stylesheet plugin end-to-end tests.
 *
 * Drives intake → resolve → emit:cssVars and asserts the plugin writes a
 * CssVarsOutputInterface to state.outputs.cssVars containing :root rules.
 */
import { test } from 'node:test';
import assert   from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import type { RoleSchemaInterface } from '@studnicky/iridis';
import { stylesheetPlugin, StylesheetPlugin } from '@studnicky/iridis-stylesheet';
import type { CssVarsOutputInterface } from '@studnicky/iridis-stylesheet/types';

const CSS_VARS_GOLDEN = new URL(
  '../fixtures/emit-cssVars-golden.css',
  import.meta.url,
);

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

// ---------------------------------------------------------------------------
// emit:cssVarsScoped + wide-gamut scenario coverage
//
// One pipeline pass per scenario; each `it` body asserts every observable
// effect of the task being exercised. Wide-gamut runs through real input
// paths — `intake:oklch` for out-of-sRGB OKLCH and `intake:p3` for the CSS
// `color(display-p3 ...)` syntax — exercising the gamut-map / displayP3
// population pipeline end-to-end (no `onRunStart` seeding).
// ---------------------------------------------------------------------------
import { describe, it }              from 'node:test';
import type {
  InputInterface,
  PaletteStateInterface,
} from '@studnicky/iridis';
import type { CssVarsScopedOutputInterface } from '@studnicky/iridis-stylesheet/types';

interface StylesheetScenarioInterface {
  readonly 'name':     string;
  readonly 'pipeline': readonly string[];
  readonly 'input':    InputInterface;
  assert(state: PaletteStateInterface): void;
}

const WIDE_GAMUT_ROLES: RoleSchemaInterface = {
  'name': 'wide-gamut',
  'roles': [
    // Wide chroma range so the resolver does NOT shrink the input
    // chroma during nudgeIntoRole — preserving the wide-gamut intent.
    { 'name': 'primary', 'required': true, 'intent': 'accent',
      'lightnessRange': [0.05, 0.95], 'chromaRange': [0.00, 0.50] },
  ],
};

describe('StylesheetPlugin e2e :: scoped + wide-gamut scenarios', () => {
  const scenarios: readonly StylesheetScenarioInterface[] = [
    {
      'name':     'emit:cssVarsScoped writes per-category blocks with [data-<scopePrefix>] selectors',
      'pipeline': ['intake:hex', 'resolve:roles', 'derive:variant', 'emit:cssVarsScoped'],
      'input': {
        'colors':   ['#5b21b6', '#c4b5fd'],
        'roles':    ROLES,
        'metadata': { 'scopePrefix': 'iridis-scope' },
      },
      assert(state): void {
        const scoped = state.outputs['cssVarsScoped'] as CssVarsScopedOutputInterface | undefined;
        assert.ok(scoped !== undefined,                   'outputs.cssVarsScoped present');
        assert.ok(typeof scoped.full === 'string',        'full is a string');
        assert.ok(typeof scoped.blocks === 'object',      'blocks is an object');
        // Root roles land under the 'default' category.
        assert.ok('default' in scoped.blocks,             'blocks contains the default category');
        // The selector form uses [data-<scopePrefix>='<category>']
        assert.ok(
          scoped.full.includes(`[data-iridis-scope='default']`),
          `full should contain [data-iridis-scope='default'] selector, got first 200 chars:\n${scoped.full.slice(0, 200)}`,
        );
        // CSS variable declarations are present under the selector.
        assert.match(scoped.full, /--c-primary:\s+#[0-9a-fA-F]{6};/, 'primary role declared as CSS var');
        // derive:variant adds 'dark' (and possibly 'light') — scoped should emit them too.
        assert.ok('dark' in scoped.blocks, 'dark variant has its own scoped block');
        assert.ok(
          scoped.full.includes(`[data-iridis-scope='dark']`),
          'full contains a scoped block for the dark variant',
        );
      },
    },
    {
      // OKLCH(0.7, 0.4, 30) is a vivid red-orange well outside sRGB —
      // every channel of the linear-sRGB conversion overflows [0, 1].
      // The factory MUST gamut-map for `rgb` and populate `displayP3`
      // from the original wide-gamut point.
      'name':     'emit:cssVars wide-gamut OKLCH input populates displayP3 and emits @supports block',
      'pipeline': ['intake:oklch', 'resolve:roles', 'emit:cssVars'],
      'input': {
        'colors': [{ 'l': 0.7, 'c': 0.4, 'h': 30 }],
        'roles':  WIDE_GAMUT_ROLES,
      },
      assert(state): void {
        const record = state.roles['primary'];
        assert.ok(record !== undefined, 'primary role resolved');

        // displayP3 populated because the input is out-of-sRGB.
        assert.ok(record.displayP3 !== undefined,
          'state.roles.primary.displayP3 is populated for out-of-sRGB OKLCH input');

        // rgb is gamut-mapped — every channel safely in [0, 1].
        assert.ok(record.rgb.r >= 0 && record.rgb.r <= 1, 'rgb.r in [0,1]');
        assert.ok(record.rgb.g >= 0 && record.rgb.g <= 1, 'rgb.g in [0,1]');
        assert.ok(record.rgb.b >= 0 && record.rgb.b <= 1, 'rgb.b in [0,1]');

        // hex matches rgb (sRGB-safe).
        assert.match(record.hex, /^#[0-9a-f]{6}$/, 'hex is canonical 6-digit sRGB form');

        // Emitted CSS contains the unconditional :root with the sRGB-safe value.
        const out = state.outputs['cssVars'] as CssVarsOutputInterface | undefined;
        assert.ok(out !== undefined, 'outputs.cssVars present');
        assert.match(out.rootBlock,
          new RegExp(`--c-primary:\\s+${record.hex};`),
          ':root block declares the sRGB-safe hex value');

        // Wide-gamut @supports block present with the P3 color.
        assert.ok(out.wideGamut.length > 0, 'wideGamut block emitted');
        assert.match(out.wideGamut, /@supports \(color: color\(display-p3 0 0 0\)\)/,
          'wideGamut is wrapped in @supports detection query');
        assert.match(out.wideGamut, /--c-primary:\s+color\(display-p3 [\d.]+ [\d.]+ [\d.]+\);/,
          'wideGamut block declares --c-primary as a display-p3 color');

        // Cascade order in `full`: rootBlock → (darkScheme) → wideGamut → forcedColors.
        const rootIdx    = out.full.indexOf(':root');
        const supportsIdx = out.full.indexOf('@supports');
        const forcedIdx  = out.full.indexOf('@media (forced-colors');
        assert.ok(rootIdx < supportsIdx,
          ':root block precedes @supports block in cascade order');
        assert.ok(supportsIdx < forcedIdx,
          '@supports block precedes @media (forced-colors) block in cascade order');
      },
    },
    {
      // intake:p3 direct CSS-color string input. The value
      // `color(display-p3 0.99 0.42 0.18)` is within the P3 gamut and
      // (depending on conversion) at the edge of sRGB — the record's
      // `displayP3` must carry the input verbatim and `sourceFormat`
      // must report `'displayP3'`.
      'name':     'emit:cssVars intake:p3 string input populates displayP3 verbatim',
      'pipeline': ['intake:p3', 'resolve:roles', 'emit:cssVars'],
      'input': {
        'colors': ['color(display-p3 0.99 0.42 0.18)'],
        'roles':  WIDE_GAMUT_ROLES,
      },
      assert(state): void {
        const record = state.roles['primary'];
        assert.ok(record !== undefined, 'primary role resolved');

        // sourceFormat: the record is rebuilt by resolve:roles via
        // factory.fromOklch (because the schema role declares an intent
        // the intake record lacks). The factory call preserves the
        // record's `sourceFormat` argument, so 'displayP3' propagates
        // through the rebuild.
        assert.strictEqual(record.sourceFormat, 'displayP3',
          "sourceFormat reports 'displayP3' for color(display-p3 ...) input");

        // displayP3 is populated. Channels match the input within the
        // OKLCH round-trip drift that fromOklch introduces during
        // resolve:roles (≪ the 4dp precision used by serializeP3).
        assert.ok(record.displayP3 !== undefined, 'displayP3 populated');
        const dp3 = record.displayP3;
        const EPS_P3 = 5e-4;
        assert.ok(Math.abs(dp3.r - 0.99) < EPS_P3, `dp3.r ≈ 0.99, got ${dp3.r}`);
        assert.ok(Math.abs(dp3.g - 0.42) < EPS_P3, `dp3.g ≈ 0.42, got ${dp3.g}`);
        assert.ok(Math.abs(dp3.b - 0.18) < EPS_P3, `dp3.b ≈ 0.18, got ${dp3.b}`);

        // rgb is sRGB-safe.
        assert.ok(record.rgb.r >= 0 && record.rgb.r <= 1, 'rgb.r in [0,1]');
        assert.ok(record.rgb.g >= 0 && record.rgb.g <= 1, 'rgb.g in [0,1]');
        assert.ok(record.rgb.b >= 0 && record.rgb.b <= 1, 'rgb.b in [0,1]');

        // Emitted CSS contains the exact P3 value at 4dp precision.
        const out = state.outputs['cssVars'] as CssVarsOutputInterface | undefined;
        assert.ok(out !== undefined, 'outputs.cssVars present');
        assert.ok(out.wideGamut.length > 0, 'wideGamut block emitted');
        assert.ok(
          out.wideGamut.includes('color(display-p3 0.9900 0.4200 0.1800)'),
          `wideGamut should contain the exact P3 input at 4dp, got:\n${out.wideGamut}`,
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

// ---------------------------------------------------------------------------
// Golden fixture — locks the full emit:cssVars output for a stable seed +
// role schema running through intake:hex → resolve:roles → expand:family →
// enforce:contrast → emit:cssVars. Any drift in role math, contrast
// enforcement, or CSS serialisation flips this test. Regenerate via
// UPDATE_GOLDENS=1 after an intentional behaviour change.
// ---------------------------------------------------------------------------

const GOLDEN_ROLES: RoleSchemaInterface = {
  'name':  'golden-cssvars',
  'roles': [
    { 'name': 'background', 'required': true, 'intent': 'background', 'lightnessRange': [0.05, 0.15], 'chromaRange': [0.00, 0.03] },
    { 'name': 'foreground', 'required': true, 'intent': 'text',    'lightnessRange': [0.90, 0.99], 'chromaRange': [0.00, 0.03] },
    { 'name': 'accent',     'required': true, 'intent': 'accent',  'lightnessRange': [0.55, 0.70], 'chromaRange': [0.15, 0.25] },
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

  const out = state.outputs['cssVars'] as CssVarsOutputInterface | undefined;
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
    'foreground role must NOT map to Canvas under forced-colors — that would make text invisible');
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
