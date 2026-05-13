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
// emit:cssVarsScoped + wide-gamut serializeP3 scenario coverage
//
// One pipeline pass per scenario; each `it` body asserts every observable
// effect of the task being exercised. Wide-gamut needs displayP3 populated
// on a record before emit:cssVars runs — we seed via an onRunStart hook
// because no intake task populates displayP3 today.
// ---------------------------------------------------------------------------
import { describe, it }              from 'node:test';
import { colorRecordFactory }        from '@studnicky/iridis';
import type {
  ColorRecordInterface,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
} from '@studnicky/iridis';
import type { CssVarsScopedOutputInterface } from '@studnicky/iridis-stylesheet/types';

interface StylesheetScenarioInterface {
  readonly 'name':     string;
  readonly 'pipeline': readonly string[];
  readonly 'input':    InputInterface;
  /** Optional onRunStart hook to seed special colors (e.g. with displayP3 populated). */
  readonly 'seed'?:    () => TaskInterface;
  assert(state: PaletteStateInterface): void;
}

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
      'name':     'emit:cssVars wide-gamut path emits color(display-p3 ...) at 4dp precision',
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:cssVars'],
      'input':    { 'colors': [], 'roles': ROLES },
      seed(): TaskInterface {
        // Build a record with displayP3 populated; nudgeIntoRole will pass it
        // straight through unchanged because L=0.6 and chroma 0.0 satisfy any
        // declared range without the factory's post-spread machinery getting
        // involved.
        const base = colorRecordFactory.fromOklch(0.6, 0.0, 0, 1, 'oklch', { 'role': 'primary' });
        const withP3: ColorRecordInterface = {
          'oklch':        base.oklch,
          'rgb':          base.rgb,
          'hex':          base.hex,
          'alpha':        base.alpha,
          'sourceFormat': base.sourceFormat,
          'displayP3':    { 'r': 1.0, 'g': 0.5, 'b': 0.25 },
          'hints':        base.hints,
        };
        return {
          'name':     'seed:displayP3',
          'manifest': { 'name': 'seed:displayP3', 'phase': 'onRunStart' },
          run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
            state.colors.push(withP3);
          },
        };
      },
      assert(state): void {
        const out = state.outputs['cssVars'] as CssVarsOutputInterface | undefined;
        assert.ok(out !== undefined, 'outputs.cssVars present');
        assert.ok(out.wideGamut.length > 0,
          'wideGamut block emitted (at least one role has displayP3)');
        // EmitCssVars.serializeP3 formats components at .toFixed(4).
        assert.ok(
          out.wideGamut.includes('color(display-p3 1.0000 0.5000 0.2500)'),
          `wideGamut should serialize at 4dp, got:\n${out.wideGamut}`,
        );
        // The wide-gamut block is wrapped in @supports.
        assert.match(out.wideGamut, /@supports \(color: color\(display-p3 1 1 1\)\)/,
          'wideGamut is wrapped in @supports query');
      },
    },
  ];

  for (const sc of scenarios) {
    it(sc.name, async () => {
      const engine = freshEngine();
      if (sc.seed) {
        engine.tasks.hook('onRunStart', sc.seed());
      }
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
    { 'name': 'background', 'required': true, 'intent': 'surface', 'lightnessRange': [0.05, 0.15], 'chromaRange': [0.00, 0.03] },
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
