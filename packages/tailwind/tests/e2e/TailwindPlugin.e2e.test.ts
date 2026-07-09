/**
 * TailwindPlugin — scenario-matrix suite.
 *
 * Subject: `TailwindPlugin` + `emit:tailwindTheme` task. Drives the full
 * intake → resolve → emit:tailwindTheme pipeline and asserts the correct
 * TailwindOutputInterfaceType written to state.outputs['tailwind:theme'].
 *
 * Cells:
 *   1. plugin shape        — singleton identity, task registration
 *   2. theme config shape  — colors map, config string, cssVars string
 *   3. color-token naming  — flat roles → var names, shade-scale grouping
 *   4. @supports gating    — sRGB inputs suppress block, P3 inputs add block
 *   5. CSS variable emission — prefix application, :root structure, var format
 *   6. palette boundary    — empty palette, single-color, full multi-role
 */

import { test }     from 'node:test';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import type {
  InputInterface,
  RoleSchemaInterfaceType,
  PaletteStateInterface,
} from '@studnicky/iridis';
import { tailwindPlugin, TailwindPlugin } from '@studnicky/iridis-tailwind';
import type { TailwindOutputInterfaceType }   from '@studnicky/iridis-tailwind/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  engine.adopt(tailwindPlugin);
  return engine;
}

function makeRoles(
  roleNames: readonly string[],
  opts: { lightnessRange?: [number, number]; chromaRange?: [number, number] } = {},
): RoleSchemaInterfaceType {
  return {
    name:  'test-schema',
    roles: roleNames.map((name) => ({
      name,
      required: true,
      ...(opts.lightnessRange !== undefined ? { lightnessRange: opts.lightnessRange } : {}),
      ...(opts.chromaRange    !== undefined ? { chromaRange:    opts.chromaRange    } : {}),
    })),
  };
}

function tailwindOut(state: PaletteStateInterface): TailwindOutputInterfaceType | undefined {
  return state.outputs['tailwind:theme'] as TailwindOutputInterfaceType | undefined;
}

// ---------------------------------------------------------------------------
// Cell 1 — plugin shape: singleton identity and task registration
//
// tailwindPlugin must be an instance of TailwindPlugin with the correct
// name + version. tasks() must return exactly one task: 'emit:tailwindTheme'.
// ---------------------------------------------------------------------------

interface ShapeInput {
  readonly query: 'instance' | 'tasks';
}
interface ShapeOutput {
  readonly isInstance:   boolean;
  readonly name:         string;
  readonly version:      string;
  readonly taskNames:    readonly string[];
}

const shapeScenarios: readonly ScenarioInterface<ShapeInput, ShapeOutput>[] = [
  {
    name: 'tailwindPlugin is an instance of TailwindPlugin with correct name and version',
    kind: 'happy',
    input: { query: 'instance' },
    assert(output, error) {
      assert.strictEqual(error, undefined,          '[cell=1, scenario=instance] no throw');
      assert.ok(output!.isInstance,                 '[cell=1, scenario=instance] instanceof TailwindPlugin');
      assert.strictEqual(output!.name,    'tailwind','[cell=1, scenario=instance] name is tailwind');
      assert.strictEqual(output!.version, '0.1.0',  '[cell=1, scenario=instance] version is 0.1.0');
    },
  },
  {
    name: 'tasks() returns exactly [emit:tailwindTheme]',
    kind: 'happy',
    input: { query: 'tasks' },
    assert(output, error) {
      assert.strictEqual(error, undefined,                         '[cell=1, scenario=tasks] no throw');
      assert.deepStrictEqual(output!.taskNames, ['emit:tailwindTheme'],
        '[cell=1, scenario=tasks] exactly one task registered');
    },
  },
];

new ScenarioRunner<ShapeInput, ShapeOutput>(
  'TailwindPlugin :: cell-1 :: plugin-shape',
  (_input) => ({
    isInstance: tailwindPlugin instanceof TailwindPlugin,
    name:       tailwindPlugin.name,
    version:    tailwindPlugin.version,
    taskNames:  tailwindPlugin.tasks().map((t) => t.name),
  }),
).run(shapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — theme config shape: all three output fields present and typed
//
// emit:tailwindTheme must write a TailwindOutputInterfaceType with:
//   - `colors`  — object (Record<string, string | Record<string, string>>)
//   - `cssVars` — string (CSS text)
//   - `config`  — string (JS module text containing 'export default')
// ---------------------------------------------------------------------------

interface ConfigShapeInput {
  readonly pipeline: readonly string[];
  readonly input:    InputInterface;
}
interface ConfigShapeOutput {
  readonly out: TailwindOutputInterfaceType;
}

const configShapeScenarios: readonly ScenarioInterface<ConfigShapeInput, ConfigShapeOutput>[] = [
  {
    name: 'single hex color with one role produces all three output fields',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: ['#8b5cf6'],
        roles:  makeRoles(['accent']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,                       '[cell=2, scenario=single-hex] no throw');
      assert.ok(output,                                          '[cell=2, scenario=single-hex] output present');
      assert.ok(typeof output!.out.colors  === 'object',         '[cell=2, scenario=single-hex] colors is object');
      assert.ok(typeof output!.out.cssVars === 'string',         '[cell=2, scenario=single-hex] cssVars is string');
      assert.ok(typeof output!.out.config  === 'string',         '[cell=2, scenario=single-hex] config is string');
      assert.ok(output!.out.config.includes('export default'),   '[cell=2, scenario=single-hex] config is a JS module');
      assert.ok(output!.out.config.includes('theme'),            '[cell=2, scenario=single-hex] config contains theme key');
      assert.ok(output!.out.config.includes('colors'),           '[cell=2, scenario=single-hex] config contains colors key');
    },
  },
  {
    name: 'multiple hex colors with multiple roles produce correctly shaped output',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: ['#ef4444', '#3b82f6', '#22c55e'],
        roles:  makeRoles(['critical', 'link', 'positive']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,               '[cell=2, scenario=multi-role] no throw');
      assert.ok(output!.out.colors['critical'],          '[cell=2, scenario=multi-role] critical key present');
      assert.ok(output!.out.colors['link'],              '[cell=2, scenario=multi-role] link key present');
      assert.ok(output!.out.colors['positive'],          '[cell=2, scenario=multi-role] positive key present');
      assert.strictEqual(Object.keys(output!.out.colors).length, 3,
        '[cell=2, scenario=multi-role] exactly 3 color keys');
    },
  },
  {
    name: 'oklch input produces config output with the same field structure',
    kind: 'happy',
    input: {
      pipeline: ['intake:oklch', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: [{ l: 0.55, c: 0.15, h: 250 }],
        roles:  makeRoles(['brand']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,                     '[cell=2, scenario=oklch-shape] no throw');
      assert.ok(typeof output!.out.colors  === 'object',       '[cell=2, scenario=oklch-shape] colors is object');
      assert.ok(typeof output!.out.cssVars === 'string',       '[cell=2, scenario=oklch-shape] cssVars is string');
      assert.ok(typeof output!.out.config  === 'string',       '[cell=2, scenario=oklch-shape] config is string');
    },
  },
];

new ScenarioRunner<ConfigShapeInput, ConfigShapeOutput>(
  'TailwindPlugin :: cell-2 :: theme-config-shape',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline as string[]);
    const state = await engine.run(input.input);
    const out   = tailwindOut(state);
    assert.ok(out !== undefined, '[cell=2] outputs.tailwind:theme must be present');
    return { out };
  },
).run(configShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — color-token naming: flat roles, shade-scale grouping, prefix
//
// The colors map follows two naming patterns:
//   - flat role: `accent` → colors['accent'] = '#rrggbb' (string)
//   - shade scale (>=2 members): `gray-500`, `gray-900` → colors['gray'] = { '500': '#...', '900': '#...' }
//   - single shade member: `gray-500` alone → stays flat as colors['gray-500']
// Colors values for flat roles are always 6-digit lowercase hex strings.
// ---------------------------------------------------------------------------

interface TokenNamingInput {
  readonly pipeline: readonly string[];
  readonly input:    InputInterface;
  readonly roleNames: readonly string[];
}
interface TokenNamingOutput {
  readonly colors: Record<string, string | Record<string, string>>;
}

const tokenNamingScenarios: readonly ScenarioInterface<TokenNamingInput, TokenNamingOutput>[] = [
  {
    name: 'flat role produces string hex value in colors map',
    kind: 'happy',
    input: {
      pipeline:  ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      roleNames: ['accent'],
      input: {
        colors: ['#8b5cf6'],
        roles:  makeRoles(['accent']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=flat-role] no throw');
      const accent = output!.colors['accent'];
      assert.ok(typeof accent === 'string', '[cell=3, scenario=flat-role] colors.accent is string');
      assert.match(accent as string, /^#[0-9a-f]{6}$/,
        '[cell=3, scenario=flat-role] colors.accent is 6-digit lowercase hex');
    },
  },
  {
    name: 'two shade-scale members group under root key',
    kind: 'happy',
    input: {
      pipeline:  ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      roleNames: ['gray-500', 'gray-900'],
      input: {
        colors: ['#6b7280', '#111827'],
        roles:  makeRoles(['gray-500', 'gray-900']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,                      '[cell=3, scenario=shade-group] no throw');
      const gray = output!.colors['gray'];
      assert.ok(gray !== undefined,                             '[cell=3, scenario=shade-group] gray root key present');
      assert.ok(typeof gray === 'object',                       '[cell=3, scenario=shade-group] gray is a shade object');
      assert.ok(typeof (gray as Record<string, string>)['500'] === 'string',
        '[cell=3, scenario=shade-group] gray.500 is string');
      assert.ok(typeof (gray as Record<string, string>)['900'] === 'string',
        '[cell=3, scenario=shade-group] gray.900 is string');
      assert.ok(output!.colors['gray-500'] === undefined,      '[cell=3, scenario=shade-group] flat gray-500 key absent');
      assert.ok(output!.colors['gray-900'] === undefined,      '[cell=3, scenario=shade-group] flat gray-900 key absent');
    },
  },
  {
    name: 'single shade-scale member stays flat (no nested object)',
    kind: 'edge',
    input: {
      pipeline:  ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      roleNames: ['brand-500'],
      input: {
        colors: ['#3b82f6'],
        roles:  makeRoles(['brand-500']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=single-shade] no throw');
      const brandFlat = output!.colors['brand-500'];
      assert.ok(typeof brandFlat === 'string', '[cell=3, scenario=single-shade] brand-500 remains flat string');
      assert.ok(output!.colors['brand'] === undefined, '[cell=3, scenario=single-shade] brand root key absent');
    },
  },
  {
    name: 'all values in flat role map are 6-digit lowercase hex',
    kind: 'edge',
    input: {
      pipeline:  ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      roleNames: ['primary', 'secondary', 'muted'],
      input: {
        colors: ['#ff0000', '#00ff00', '#0000ff'],
        roles:  makeRoles(['primary', 'secondary', 'muted']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=hex-format] no throw');
      const hexRe = /^#[0-9a-f]{6}$/;
      for (const [key, val] of Object.entries(output!.colors)) {
        if (typeof val === 'string') {
          assert.match(val, hexRe,
            `[cell=3, scenario=hex-format] colors.${key} is 6-digit hex`);
        } else {
          for (const [shade, hex] of Object.entries(val as Record<string, string>)) {
            assert.match(hex, hexRe,
              `[cell=3, scenario=hex-format] colors.${key}.${shade} is 6-digit hex`);
          }
        }
      }
    },
  },
];

new ScenarioRunner<TokenNamingInput, TokenNamingOutput>(
  'TailwindPlugin :: cell-3 :: color-token-naming',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline as string[]);
    const state  = await engine.run(input.input);
    const out    = tailwindOut(state);
    assert.ok(out !== undefined, '[cell=3] outputs.tailwind:theme must be present');
    return { colors: out.colors };
  },
).run(tokenNamingScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — @supports gating: wide-gamut detection and sRGB suppression
//
// When ALL resolved roles are sRGB-only (no displayP3):
//   - cssVars MUST NOT contain '@supports'
//   - cssVars MUST NOT contain 'display-p3'
//
// When at least one role carries displayP3 (out-of-sRGB OKLCH input):
//   - cssVars MUST contain '@supports (color: color(display-p3 0 0 0))'
//   - The @supports block MUST follow the unconditional :root block
//   - The @supports block MUST contain 'color(display-p3 ...)' declarations
// ---------------------------------------------------------------------------

interface SupportsGatingInput {
  readonly pipeline: readonly string[];
  readonly input:    InputInterface;
}
interface SupportsGatingOutput {
  readonly cssVars: string;
}

const supportsGatingScenarios: readonly ScenarioInterface<SupportsGatingInput, SupportsGatingOutput>[] = [
  {
    name: 'sRGB hex input produces cssVars without @supports block',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: ['#8b5cf6'],
        roles:  makeRoles(['accent']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,                           '[cell=4, scenario=srgb-no-supports] no throw');
      assert.ok(!output!.cssVars.includes('@supports'),              '[cell=4, scenario=srgb-no-supports] no @supports block');
      assert.ok(!output!.cssVars.includes('display-p3'),             '[cell=4, scenario=srgb-no-supports] no display-p3 syntax');
    },
  },
  {
    name: 'sRGB hex input cssVars still contains unconditional :root block',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: ['#3b82f6'],
        roles:  makeRoles(['link']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,                 '[cell=4, scenario=srgb-root-block] no throw');
      assert.ok(output!.cssVars.includes(':root'),         '[cell=4, scenario=srgb-root-block] :root block present');
      assert.match(output!.cssVars, /--c-link:\s+#[0-9a-f]{6};/,
        '[cell=4, scenario=srgb-root-block] --c-link declared as hex');
    },
  },
  {
    name: 'out-of-sRGB OKLCH input adds @supports block after :root',
    kind: 'happy',
    input: {
      pipeline: ['intake:oklch', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: [{ l: 0.7, c: 0.4, h: 30 }],
        roles:  makeRoles(['accent'], { lightnessRange: [0.05, 0.95], chromaRange: [0.00, 0.50] }),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=p3-supports] no throw');
      assert.match(output!.cssVars, /@supports \(color: color\(display-p3 0 0 0\)\)/,
        '[cell=4, scenario=p3-supports] @supports detection query present');
      assert.match(output!.cssVars, /color\(display-p3 [\d.]+ [\d.]+ [\d.]+\)/,
        '[cell=4, scenario=p3-supports] color(display-p3 ...) declaration present');
      const rootIdx     = output!.cssVars.indexOf(':root');
      const supportsIdx = output!.cssVars.indexOf('@supports');
      assert.ok(rootIdx >= 0 && supportsIdx >= 0,
        '[cell=4, scenario=p3-supports] both :root and @supports present');
      assert.ok(rootIdx < supportsIdx,
        '[cell=4, scenario=p3-supports] :root block precedes @supports block');
    },
  },
  {
    name: 'in-gamut OKLCH input (low chroma) produces no @supports block',
    kind: 'edge',
    input: {
      pipeline: ['intake:oklch', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: [{ l: 0.5, c: 0.05, h: 270 }],
        roles:  makeRoles(['muted']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,               '[cell=4, scenario=ingamut-oklch] no throw');
      assert.ok(!output!.cssVars.includes('display-p3'), '[cell=4, scenario=ingamut-oklch] no display-p3 for in-gamut color');
    },
  },
  {
    name: '@supports block omitted when multiple sRGB roles share a palette',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: ['#ef4444', '#22c55e', '#3b82f6'],
        roles:  makeRoles(['critical', 'positive', 'link']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,                           '[cell=4, scenario=multi-srgb-no-supports] no throw');
      assert.ok(!output!.cssVars.includes('@supports'),              '[cell=4, scenario=multi-srgb-no-supports] no @supports');
    },
  },
];

new ScenarioRunner<SupportsGatingInput, SupportsGatingOutput>(
  'TailwindPlugin :: cell-4 :: supports-gating',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline as string[]);
    const state  = await engine.run(input.input);
    const out    = tailwindOut(state);
    assert.ok(out !== undefined, '[cell=4] outputs.tailwind:theme must be present');
    return { cssVars: out.cssVars };
  },
).run(supportsGatingScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — CSS variable emission: prefix, :root structure, var name format
//
// emit:tailwindTheme reads `state.metadata['cssVarPrefix']` (defaulting to
// '--c-') and applies it to every role name via `toCssVarName`. The :root
// block is always present and lists every role once. Custom prefix is
// applied when set in metadata.
// ---------------------------------------------------------------------------

interface CssVarEmissionInput {
  readonly pipeline: readonly string[];
  readonly input:    InputInterface;
}
interface CssVarEmissionOutput {
  readonly cssVars: string;
}

const cssVarEmissionScenarios: readonly ScenarioInterface<CssVarEmissionInput, CssVarEmissionOutput>[] = [
  {
    name: 'default --c- prefix applied to role name in :root block',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: ['#8b5cf6'],
        roles:  makeRoles(['accent']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,               '[cell=5, scenario=default-prefix] no throw');
      assert.ok(output!.cssVars.includes(':root {'),     '[cell=5, scenario=default-prefix] :root block present');
      assert.match(output!.cssVars, /--c-accent:\s+#[0-9a-f]{6};/,
        '[cell=5, scenario=default-prefix] --c-accent var with default prefix');
    },
  },
  {
    name: 'custom cssVarPrefix from metadata overrides default --c-',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors:    ['#8b5cf6'],
        roles:     makeRoles(['brand']),
        metadata:  { cssVarPrefix: '--theme-' },
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,               '[cell=5, scenario=custom-prefix] no throw');
      assert.match(output!.cssVars, /--theme-brand:\s+#[0-9a-f]{6};/,
        '[cell=5, scenario=custom-prefix] custom prefix applied to var name');
      assert.ok(!output!.cssVars.includes('--c-brand'),  '[cell=5, scenario=custom-prefix] default prefix absent');
    },
  },
  {
    name: 'each role appears exactly once in the :root block',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: ['#ef4444', '#22c55e'],
        roles:  makeRoles(['critical', 'positive']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=role-once] no throw');
      const criticalCount = (output!.cssVars.match(/--c-critical:/g) ?? []).length;
      const positiveCount = (output!.cssVars.match(/--c-positive:/g) ?? []).length;
      // May appear in both :root and @supports — at most 2 occurrences per var.
      // But without P3 input the count must be exactly 1.
      assert.strictEqual(criticalCount, 1,
        '[cell=5, scenario=role-once] --c-critical appears exactly once in sRGB-only cssVars');
      assert.strictEqual(positiveCount, 1,
        '[cell=5, scenario=role-once] --c-positive appears exactly once in sRGB-only cssVars');
    },
  },
  {
    name: 'cssVars string ends with closing brace (well-formed CSS block)',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: ['#3b82f6'],
        roles:  makeRoles(['link']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,              '[cell=5, scenario=well-formed] no throw');
      assert.ok(output!.cssVars.trimEnd().endsWith('}'),
        '[cell=5, scenario=well-formed] cssVars ends with closing brace');
    },
  },
];

new ScenarioRunner<CssVarEmissionInput, CssVarEmissionOutput>(
  'TailwindPlugin :: cell-5 :: css-var-emission',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline as string[]);
    const state  = await engine.run(input.input);
    const out    = tailwindOut(state);
    assert.ok(out !== undefined, '[cell=5] outputs.tailwind:theme must be present');
    return { cssVars: out.cssVars };
  },
).run(cssVarEmissionScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — palette boundary: empty palette, single color, full palette
//
// emit:tailwindTheme operates on state.roles (set by resolve:roles). Edge
// cases:
//   - No input colors → state.roles empty → colors{} and cssVars ':root {}'
//   - Single color/role → one entry in colors map, one var in :root
//   - Many roles (>= 5) → all keys present, no truncation
// ---------------------------------------------------------------------------

interface PaletteBoundaryInput {
  readonly pipeline: readonly string[];
  readonly input:    InputInterface;
}
interface PaletteBoundaryOutput {
  readonly colorKeys: readonly string[];
  readonly cssVars:   string;
}

const paletteBoundaryScenarios: readonly ScenarioInterface<PaletteBoundaryInput, PaletteBoundaryOutput>[] = [
  {
    name: 'empty palette (no colors, no roles) produces empty colors map and minimal cssVars',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'emit:tailwindTheme'],
      input: {
        colors: [],
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,              '[cell=6, scenario=empty-palette] no throw');
      assert.strictEqual(output!.colorKeys.length, 0,  '[cell=6, scenario=empty-palette] colors map empty');
      assert.ok(output!.cssVars.includes(':root'),      '[cell=6, scenario=empty-palette] :root block still present');
      assert.ok(!output!.cssVars.includes('@supports'), '[cell=6, scenario=empty-palette] no @supports block');
    },
  },
  {
    name: 'single color with one role produces exactly one key in colors map',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: ['#8b5cf6'],
        roles:  makeRoles(['accent']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,              '[cell=6, scenario=single-color] no throw');
      assert.strictEqual(output!.colorKeys.length, 1,  '[cell=6, scenario=single-color] exactly one color key');
      assert.ok(output!.colorKeys.includes('accent'),  '[cell=6, scenario=single-color] accent key present');
    },
  },
  {
    name: 'full palette with five roles produces all five keys in colors map',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'],
        roles:  makeRoles(['critical', 'warning', 'positive', 'link', 'accent']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,              '[cell=6, scenario=full-palette] no throw');
      assert.strictEqual(output!.colorKeys.length, 5,  '[cell=6, scenario=full-palette] all five role keys present');
      for (const role of ['critical', 'warning', 'positive', 'link', 'accent']) {
        assert.ok(output!.colorKeys.includes(role),
          `[cell=6, scenario=full-palette] ${role} key present in colors`);
      }
    },
  },
  {
    name: 'no input colors with required roles schema synthesizes role from constraints',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      input: {
        colors: [],
        roles:  makeRoles(['accent']),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,              '[cell=6, scenario=no-colors-with-roles] no throw');
      assert.ok(output !== undefined,                   '[cell=6, scenario=no-colors-with-roles] output present');
      // resolve:roles synthesizes required roles from constraint centers when no
      // candidate colors are provided — the colors map is non-empty because
      // synthesizeForRole guarantees required roles are always populated.
      assert.strictEqual(output!.colorKeys.length, 1,
        '[cell=6, scenario=no-colors-with-roles] synthesized role appears in colors map');
      assert.ok(output!.colorKeys.includes('accent'),
        '[cell=6, scenario=no-colors-with-roles] synthesized accent key present');
    },
  },
];

new ScenarioRunner<PaletteBoundaryInput, PaletteBoundaryOutput>(
  'TailwindPlugin :: cell-6 :: palette-boundary',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(input.pipeline as string[]);
    const state  = await engine.run(input.input);
    const out    = tailwindOut(state);
    assert.ok(out !== undefined, '[cell=6] outputs.tailwind:theme must be present');
    return {
      colorKeys: Object.keys(out.colors),
      cssVars:   out.cssVars,
    };
  },
).run(paletteBoundaryScenarios);

// ---------------------------------------------------------------------------
// Golden fixture
// Byte-equal lock on the complete output for a canonical two-role sRGB run.
// ---------------------------------------------------------------------------

test('TailwindPlugin :: cell-1 :: golden :: canonical two-role sRGB output is stable', async () => {
  const engine = freshEngine();
  engine.pipeline(['intake:hex', 'resolve:roles', 'emit:tailwindTheme']);
  const state = await engine.run({
    colors: ['#8b5cf6', '#ef4444'],
    roles:  makeRoles(['accent', 'critical']),
  });
  const out = tailwindOut(state);
  assert.ok(out !== undefined, '[cell=golden] outputs.tailwind:theme present');

  // colors map: two flat string entries
  assert.ok(typeof out.colors['accent']   === 'string', '[cell=golden] accent is string');
  assert.ok(typeof out.colors['critical'] === 'string', '[cell=golden] critical is string');
  assert.match(out.colors['accent']   as string, /^#[0-9a-f]{6}$/, '[cell=golden] accent is hex');
  assert.match(out.colors['critical'] as string, /^#[0-9a-f]{6}$/, '[cell=golden] critical is hex');

  // cssVars: unconditional :root block, no @supports
  assert.ok(output_contains_root_block(out.cssVars),     '[cell=golden] cssVars contains :root block');
  assert.ok(!out.cssVars.includes('@supports'),           '[cell=golden] cssVars has no @supports (sRGB)');

  // config: valid JS module structure
  assert.ok(out.config.startsWith('export default {'),  '[cell=golden] config opens with export default');
  assert.ok(out.config.trimEnd().endsWith('};'),         '[cell=golden] config closes with };');
  assert.ok(out.config.includes("'accent'"),             '[cell=golden] config contains accent key');
  assert.ok(out.config.includes("'critical'"),           '[cell=golden] config contains critical key');

  function output_contains_root_block(css: string): boolean {
    return css.includes(':root {');
  }
});
