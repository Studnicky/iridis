/**
 * Tailwind plugin end-to-end tests.
 *
 * Drives intake → resolve → emit:tailwindTheme and asserts the plugin writes
 * a TailwindOutputInterface to state.outputs.tailwind containing a colors map.
 */
import { test } from 'node:test';
import assert   from 'node:assert/strict';

import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import type { RoleSchemaInterface } from '@studnicky/iridis';
import { tailwindPlugin, TailwindPlugin } from '@studnicky/iridis-tailwind';
import type { TailwindOutputInterface }   from '@studnicky/iridis-tailwind/types';

const ROLES: RoleSchemaInterface = {
  'name': 'simple',
  'roles': [
    { 'name': 'accent', 'required': true },
  ],
};

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.adopt(tailwindPlugin);
  return engine;
}

test('TailwindPlugin e2e :: shape :: singleton is an instance of TailwindPlugin', () => {
  assert.ok(tailwindPlugin instanceof TailwindPlugin);
  assert.strictEqual(tailwindPlugin.name,    'tailwind');
  assert.strictEqual(tailwindPlugin.version, '0.1.0');
});

test('TailwindPlugin e2e :: shape :: registers emit:tailwindTheme', () => {
  const taskNames = tailwindPlugin.tasks().map((t) => t.name);
  assert.deepStrictEqual(taskNames, ['emit:tailwindTheme']);
});

test('TailwindPlugin e2e :: happy :: emit:tailwindTheme writes colors + cssVars + config', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'emit:tailwindTheme',
  ]);

  const state = await engine.run({
    'colors': ['#8b5cf6'],
    'roles':  ROLES,
  });

  const out = state.outputs['tailwind'] as TailwindOutputInterface | undefined;
  assert.ok(out !== undefined,                 'outputs.tailwind present');
  assert.ok(typeof out.colors  === 'object',   'colors is an object');
  assert.ok(typeof out.cssVars === 'string',   'cssVars is a string');
  assert.ok(typeof out.config  === 'string',   'config is a string');
  // sRGB-only input — no @supports / display-p3 syntax in cssVars.
  assert.ok(!out.cssVars.includes('@supports'),
    'sRGB-only input leaves cssVars without an @supports block');
  assert.ok(!out.cssVars.includes('display-p3'),
    'sRGB-only input leaves cssVars without any display-p3 syntax');
});

// ---------------------------------------------------------------------------
// R7.2 — wide-gamut P3 propagation through emit:tailwindTheme. The tailwind
// plugin emits both a JSON `colors` config (consumed by Tailwind's own CSS
// generation) AND a direct `cssVars` sheet for Tailwind v4 `@theme`
// references. The cssVars sheet is direct CSS — it gains an
// `@supports (color: color(display-p3 0 0 0))` block that re-declares
// wide-gamut roles in P3 form. The `colors` JSON keeps sRGB hex values
// (Tailwind v4 sees them through the cssVars cascade anyway).
//
// One scenario, many assertions per `it`.
// ---------------------------------------------------------------------------
import { describe, it } from 'node:test';
import type {
  InputInterface,
  PaletteStateInterface,
} from '@studnicky/iridis';

interface TailwindScenarioInterface {
  readonly 'name':     string;
  readonly 'pipeline': readonly string[];
  readonly 'input':    InputInterface;
  assert(state: PaletteStateInterface): void;
}

const WIDE_GAMUT_ROLES: RoleSchemaInterface = {
  'name':  'wide-gamut',
  'roles': [
    { 'name': 'accent', 'required': true, 'intent': 'accent',
      'lightnessRange': [0.05, 0.95], 'chromaRange': [0.00, 0.50] },
  ],
};

describe('TailwindPlugin e2e :: wide-gamut scenarios', () => {
  const scenarios: readonly TailwindScenarioInterface[] = [
    {
      'name':     'emit:tailwindTheme wraps P3 declarations in @supports for wide-gamut OKLCH input',
      'pipeline': ['intake:oklch', 'resolve:roles', 'emit:tailwindTheme'],
      'input': {
        'colors': [{ 'l': 0.7, 'c': 0.4, 'h': 30 }],
        'roles':  WIDE_GAMUT_ROLES,
      },
      assert(state): void {
        const record = state.roles['accent'];
        assert.ok(record !== undefined,         'accent role resolved');
        assert.ok(record.displayP3 !== undefined,
          'accent record carries displayP3 for out-of-sRGB OKLCH input');

        const out = state.outputs['tailwind'] as TailwindOutputInterface | undefined;
        assert.ok(out !== undefined, 'outputs.tailwind present');

        // cssVars: sRGB :root block UNCONDITIONAL, then @supports sibling.
        assert.match(out.cssVars,
          new RegExp(`:root \\{[\\s\\S]*?--c-accent:\\s+${record.hex};`),
          ':root block declares --c-accent as the gamut-mapped sRGB hex');
        assert.match(out.cssVars, /@supports \(color: color\(display-p3 0 0 0\)\)/,
          'cssVars contains an @supports detection query');
        assert.match(out.cssVars, /--c-accent:\s+color\(display-p3 [\d.]+ [\d.]+ [\d.]+\);/,
          '@supports block declares --c-accent as color(display-p3 ...)');

        // Cascade order — :root first, @supports after.
        const rootIdx     = out.cssVars.indexOf(':root');
        const supportsIdx = out.cssVars.indexOf('@supports');
        assert.ok(rootIdx >= 0 && supportsIdx >= 0,
          'both :root and @supports present in cssVars');
        assert.ok(rootIdx < supportsIdx,
          ':root block precedes @supports block in cssVars cascade');

        // colors JSON keeps sRGB hex — the wide-gamut surfacing happens via
        // the cssVars cascade, not in the static config object.
        const accentColor = out.colors['accent'];
        assert.ok(typeof accentColor === 'string',
          'colors.accent is a string (single value, not a shade scale)');
        assert.match(accentColor as string, /^#[0-9a-f]{6}$/,
          'colors.accent is a 6-digit sRGB hex (Tailwind config stays sRGB)');
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
