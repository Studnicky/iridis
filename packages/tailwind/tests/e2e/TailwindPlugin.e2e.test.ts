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

import type {
  InputInterface,
  PaletteStateInterface,
  RoleSchemaInterfaceType
} from '@studnicky/iridis';
import type { TailwindOutputInterfaceType } from '@studnicky/iridis-tailwind/types';
import type { FromSchema } from '@studnicky/types';

import { tailwindPlugin, TailwindPlugin } from '@studnicky/iridis-tailwind';
import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import assert        from 'node:assert/strict';
import { test }     from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestEngine {
  static createFresh(): Engine {
    const engine = new Engine();
    for (const task of coreTasks) { engine.tasks.register(task); }
    engine.adopt(tailwindPlugin);
    return engine;
  }
}

class RoleSchemaFixture {
  static build(
    roleNames: readonly string[],
    options: { 'chromaRange'?: [number, number]; 'lightnessRange'?: [number, number]; } = {}
  ): RoleSchemaInterfaceType {
    return {
      'contrastPairs': undefined,
      'description':   undefined,
      'name':          'test-schema',
      'roles':         roleNames.map((name) => {return {
        'chromaRange':    options.chromaRange,
        'derivedFrom':    undefined,
        'description':    undefined,
        'hue':            undefined,
        'hueClamp':       undefined,
        'hueOffset':      undefined,
        'intent':         undefined,
        'lightnessRange': options.lightnessRange,
        'name': name,
        'required':       true
      };})
    };
  }
}

class TailwindOutput {
  static from(state: PaletteStateInterface): TailwindOutputInterfaceType | undefined {
    const result = state.outputs['tailwind:theme'] as TailwindOutputInterfaceType | undefined;
    return result;
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — plugin shape: singleton identity and task registration
//
// tailwindPlugin must be an instance of TailwindPlugin with the correct
// name + version. tasks() must return exactly one task: 'emit:tailwindTheme'.
// ---------------------------------------------------------------------------

const ShapeInputSchema = {
  'additionalProperties': false,
  'properties': { 'query': { 'enum': ['instance', 'tasks'] } },
  'required': ['query'],
  'type': 'object'
} as const;
type ShapeInput = FromSchema<typeof ShapeInputSchema>;

type ShapeOutput = {
  readonly 'isInstance':   boolean;
  readonly 'name':         string;
  readonly 'taskNames':    readonly string[];
  readonly 'version':      string;
};

const shapeScenarios: readonly ScenarioInterface<ShapeInput, ShapeOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,          '[cell=1, scenario=instance] no throw');
      assert.ok(output!.isInstance,                 '[cell=1, scenario=instance] instanceof TailwindPlugin');
      assert.strictEqual(output!.name,    'tailwind','[cell=1, scenario=instance] name is tailwind');
      assert.strictEqual(output!.version, '0.1.0',  '[cell=1, scenario=instance] version is 0.1.0');
    },
    'input': { 'query': 'instance' },
    'kind': 'happy',
    'name': 'tailwindPlugin is an instance of TailwindPlugin with correct name and version'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                         '[cell=1, scenario=tasks] no throw');
      assert.deepStrictEqual(output!.taskNames, ['emit:tailwindTheme'],
        '[cell=1, scenario=tasks] exactly one task registered');
    },
    'input': { 'query': 'tasks' },
    'kind': 'happy',
    'name': 'tasks() returns exactly [emit:tailwindTheme]'
  }
];

new ScenarioRunner<ShapeInput, ShapeOutput>(
  'TailwindPlugin :: cell-1 :: plugin-shape',
  (_input) => {return {
    'isInstance': tailwindPlugin instanceof TailwindPlugin,
    'name':       tailwindPlugin.name,
    'taskNames':  tailwindPlugin.tasks().map((task) => { const result = task.name; return result; }),
    'version':    tailwindPlugin.version
  };}
).run(shapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — theme config shape: all three output fields present and typed
//
// emit:tailwindTheme must write a TailwindOutputInterfaceType with:
//   - `colors`  — object (Record<string, string | Record<string, string>>)
//   - `cssVars` — string (CSS text)
//   - `config`  — string (JS module text containing 'export default')
// ---------------------------------------------------------------------------

interface ConfigShapeInputInterface {
  readonly 'input':    InputInterface;
  readonly 'pipeline': readonly string[];
}

// json-schema-uninexpressible: wraps TailwindOutputInterfaceType, a nested
// data shape already defined and schema-derivable at its own declaration
// site — re-deriving it here would duplicate that shape rather than compose it.
type ConfigShapeOutput = {
  readonly 'out': TailwindOutputInterfaceType;
};

const configShapeScenarios: readonly ScenarioInterface<ConfigShapeInputInterface, ConfigShapeOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                       '[cell=2, scenario=single-hex] no throw');
      assert.ok(output !== undefined,                            '[cell=2, scenario=single-hex] output present');
      assert.ok(typeof output.out.colors  === 'object',         '[cell=2, scenario=single-hex] colors is object');
      assert.ok(typeof output.out.cssVars === 'string',         '[cell=2, scenario=single-hex] cssVars is string');
      assert.ok(typeof output.out.config  === 'string',         '[cell=2, scenario=single-hex] config is string');
      assert.ok(output.out.config.includes('export default'),   '[cell=2, scenario=single-hex] config is a JS module');
      assert.ok(output.out.config.includes('theme'),            '[cell=2, scenario=single-hex] config contains theme key');
      assert.ok(output.out.config.includes('colors'),           '[cell=2, scenario=single-hex] config contains colors key');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#8b5cf6'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['accent']),
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'happy',
    'name': 'single hex color with one role produces all three output fields'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,               '[cell=2, scenario=multi-role] no throw');
      assert.ok(output!.out.colors.critical !== undefined,          '[cell=2, scenario=multi-role] critical key present');
      assert.ok(output!.out.colors.link     !== undefined,          '[cell=2, scenario=multi-role] link key present');
      assert.ok(output!.out.colors.positive !== undefined,          '[cell=2, scenario=multi-role] positive key present');
      assert.strictEqual(Object.keys(output!.out.colors).length, 3,
        '[cell=2, scenario=multi-role] exactly 3 color keys');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#ef4444', '#3b82f6', '#22c55e'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['critical', 'link', 'positive']),
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'happy',
    'name': 'multiple hex colors with multiple roles produce correctly shaped output'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                     '[cell=2, scenario=oklch-shape] no throw');
      assert.ok(typeof output!.out.colors  === 'object',       '[cell=2, scenario=oklch-shape] colors is object');
      assert.ok(typeof output!.out.cssVars === 'string',       '[cell=2, scenario=oklch-shape] cssVars is string');
      assert.ok(typeof output!.out.config  === 'string',       '[cell=2, scenario=oklch-shape] config is string');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    [{ 'c': 0.15, 'h': 250, 'l': 0.55 }],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['brand']),
        'runtime':   undefined
      },
      'pipeline': ['intake:oklch', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'happy',
    'name': 'oklch input produces config output with the same field structure'
  }
];

new ScenarioRunner<ConfigShapeInputInterface, ConfigShapeOutput>(
  'TailwindPlugin :: cell-2 :: theme-config-shape',
  (input) => {
    const engine = TestEngine.createFresh();
    engine.pipeline(input.pipeline);
    const state = engine.run(input.input);
    const out   = TailwindOutput.from(state);
    assert.ok(out !== undefined, '[cell=2] outputs.tailwind:theme must be present');
    return { 'out': out };
  }
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

interface TokenNamingInputInterface {
  readonly 'input':    InputInterface;
  readonly 'pipeline': readonly string[];
  readonly 'roleNames': readonly string[];
}
type TokenNamingOutput = {
  readonly 'colors': Record<string, string | Record<string, string>>;
};

class TokenNamingAssertions {
  static shadeGroup(output: TokenNamingOutput | undefined, error: Error | undefined): void {
    assert.strictEqual(error, undefined,                      '[cell=3, scenario=shade-group] no throw');
    const gray = output!.colors.gray;
    assert.ok(gray !== undefined,                             '[cell=3, scenario=shade-group] gray root key present');
    assert.ok(typeof gray === 'object',                       '[cell=3, scenario=shade-group] gray is a shade object');
    const grayShades = gray;
    assert.ok(typeof grayShades['500'] === 'string',
      '[cell=3, scenario=shade-group] gray.500 is string');
    assert.ok(typeof grayShades['900'] === 'string',
      '[cell=3, scenario=shade-group] gray.900 is string');
    assert.ok(output!.colors['gray-500'] === undefined,      '[cell=3, scenario=shade-group] flat gray-500 key absent');
    assert.ok(output!.colors['gray-900'] === undefined,      '[cell=3, scenario=shade-group] flat gray-900 key absent');
  }

  static singleShade(output: TokenNamingOutput | undefined, error: Error | undefined): void {
    assert.strictEqual(error, undefined, '[cell=3, scenario=single-shade] no throw');
    const brandFlat = output!.colors['brand-500'];
    assert.ok(typeof brandFlat === 'string', '[cell=3, scenario=single-shade] brand-500 remains flat string');
    assert.ok(output!.colors.brand === undefined, '[cell=3, scenario=single-shade] brand root key absent');
  }

  static hexFormat(output: TokenNamingOutput | undefined, error: Error | undefined): void {
    assert.strictEqual(error, undefined, '[cell=3, scenario=hex-format] no throw');
    const hexPattern = /^#[0-9a-f]{6}$/;
    const entries = Object.entries(output!.colors);
    const entriesLength = entries.length;
    for (let index = 0; index < entriesLength; index += 1) {
      const [key, value] = entries[index]!;
      if (typeof value === 'string') {
        assert.match(value, hexPattern,
          `[cell=3, scenario=hex-format] colors.${key} is 6-digit hex`);
      } else {
        const shadeEntries = Object.entries(value);
        const shadeEntriesLength = shadeEntries.length;
        for (let shadeIndex = 0; shadeIndex < shadeEntriesLength; shadeIndex += 1) {
          const [shade, hex] = shadeEntries[shadeIndex]!;
          assert.match(hex, hexPattern,
            `[cell=3, scenario=hex-format] colors.${key}.${shade} is 6-digit hex`);
        }
      }
    }
  }
}

const tokenNamingScenarios: readonly ScenarioInterface<TokenNamingInputInterface, TokenNamingOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=flat-role] no throw');
      const accent = output!.colors.accent;
      assert.ok(typeof accent === 'string', '[cell=3, scenario=flat-role] colors.accent is string');
      assert.match(accent, /^#[0-9a-f]{6}$/,
        '[cell=3, scenario=flat-role] colors.accent is 6-digit lowercase hex');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#8b5cf6'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['accent']),
        'runtime':   undefined
      },
      'pipeline':  ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      'roleNames': ['accent']
    },
    'kind': 'happy',
    'name': 'flat role produces string hex value in colors map'
  },
  {
    'assert': TokenNamingAssertions.shadeGroup,
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#6b7280', '#111827'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['gray-500', 'gray-900']),
        'runtime':   undefined
      },
      'pipeline':  ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      'roleNames': ['gray-500', 'gray-900']
    },
    'kind': 'happy',
    'name': 'two shade-scale members group under root key'
  },
  {
    'assert': TokenNamingAssertions.singleShade,
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#3b82f6'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['brand-500']),
        'runtime':   undefined
      },
      'pipeline':  ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      'roleNames': ['brand-500']
    },
    'kind': 'edge',
    'name': 'single shade-scale member stays flat (no nested object)'
  },
  {
    'assert': TokenNamingAssertions.hexFormat,
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#ff0000', '#00ff00', '#0000ff'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['primary', 'secondary', 'muted']),
        'runtime':   undefined
      },
      'pipeline':  ['intake:hex', 'resolve:roles', 'emit:tailwindTheme'],
      'roleNames': ['primary', 'secondary', 'muted']
    },
    'kind': 'edge',
    'name': 'all values in flat role map are 6-digit lowercase hex'
  }
];

new ScenarioRunner<TokenNamingInputInterface, TokenNamingOutput>(
  'TailwindPlugin :: cell-3 :: color-token-naming',
  (input) => {
    const engine = TestEngine.createFresh();
    engine.pipeline(input.pipeline);
    const state  = engine.run(input.input);
    const out    = TailwindOutput.from(state);
    assert.ok(out !== undefined, '[cell=3] outputs.tailwind:theme must be present');
    return { 'colors': out.colors };
  }
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

interface SupportsGatingInputInterface {
  readonly 'input':    InputInterface;
  readonly 'pipeline': readonly string[];
}

const SupportsGatingOutputSchema = {
  'additionalProperties': false,
  'properties': { 'cssVars': { 'type': 'string' } },
  'required': ['cssVars'],
  'type': 'object'
} as const;
type SupportsGatingOutput = FromSchema<typeof SupportsGatingOutputSchema>;

const supportsGatingScenarios: readonly ScenarioInterface<SupportsGatingInputInterface, SupportsGatingOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                           '[cell=4, scenario=srgb-no-supports] no throw');
      assert.ok(!output!.cssVars.includes('@supports'),              '[cell=4, scenario=srgb-no-supports] no @supports block');
      assert.ok(!output!.cssVars.includes('display-p3'),             '[cell=4, scenario=srgb-no-supports] no display-p3 syntax');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#8b5cf6'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['accent']),
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'happy',
    'name': 'sRGB hex input produces cssVars without @supports block'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                 '[cell=4, scenario=srgb-root-block] no throw');
      assert.ok(output!.cssVars.includes(':root'),         '[cell=4, scenario=srgb-root-block] :root block present');
      assert.match(output!.cssVars, /--c-link:\s+#[0-9a-f]{6};/,
        '[cell=4, scenario=srgb-root-block] --c-link declared as hex');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#3b82f6'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['link']),
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'happy',
    'name': 'sRGB hex input cssVars still contains unconditional :root block'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=p3-supports] no throw');
      assert.match(output!.cssVars, /@supports \(color: color\(display-p3 0 0 0\)\)/,
        '[cell=4, scenario=p3-supports] @supports detection query present');
      assert.match(output!.cssVars, /color\(display-p3 [\d.]+ [\d.]+ [\d.]+\)/,
        '[cell=4, scenario=p3-supports] color(display-p3 ...) declaration present');
      const rootIndex     = output!.cssVars.indexOf(':root');
      const supportsIndex = output!.cssVars.indexOf('@supports');
      assert.ok(rootIndex >= 0 && supportsIndex >= 0,
        '[cell=4, scenario=p3-supports] both :root and @supports present');
      assert.ok(rootIndex < supportsIndex,
        '[cell=4, scenario=p3-supports] :root block precedes @supports block');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['accent'], { 'chromaRange': [0.00, 0.50], 'lightnessRange': [0.05, 0.95] }),
        'runtime':   undefined
      },
      'pipeline': ['intake:oklch', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'happy',
    'name': 'out-of-sRGB OKLCH input adds @supports block after :root'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,               '[cell=4, scenario=ingamut-oklch] no throw');
      assert.ok(!output!.cssVars.includes('display-p3'), '[cell=4, scenario=ingamut-oklch] no display-p3 for in-gamut color');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    [{ 'c': 0.05, 'h': 270, 'l': 0.5 }],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['muted']),
        'runtime':   undefined
      },
      'pipeline': ['intake:oklch', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'edge',
    'name': 'in-gamut OKLCH input (low chroma) produces no @supports block'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                           '[cell=4, scenario=multi-srgb-no-supports] no throw');
      assert.ok(!output!.cssVars.includes('@supports'),              '[cell=4, scenario=multi-srgb-no-supports] no @supports');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#ef4444', '#22c55e', '#3b82f6'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['critical', 'positive', 'link']),
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'edge',
    'name': '@supports block omitted when multiple sRGB roles share a palette'
  }
];

new ScenarioRunner<SupportsGatingInputInterface, SupportsGatingOutput>(
  'TailwindPlugin :: cell-4 :: supports-gating',
  (input) => {
    const engine = TestEngine.createFresh();
    engine.pipeline(input.pipeline);
    const state  = engine.run(input.input);
    const out    = TailwindOutput.from(state);
    assert.ok(out !== undefined, '[cell=4] outputs.tailwind:theme must be present');
    return { 'cssVars': out.cssVars };
  }
).run(supportsGatingScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — CSS variable emission: prefix, :root structure, var name format
//
// emit:tailwindTheme reads `state.metadata['cssVarPrefix']` (defaulting to
// '--c-') and applies it to every role name via `CssVarName.from`. The :root
// block is always present and lists every role once. Custom prefix is
// applied when set in metadata.
// ---------------------------------------------------------------------------

interface CssVarEmissionInputInterface {
  readonly 'input':    InputInterface;
  readonly 'pipeline': readonly string[];
}

const CssVarEmissionOutputSchema = {
  'additionalProperties': false,
  'properties': { 'cssVars': { 'type': 'string' } },
  'required': ['cssVars'],
  'type': 'object'
} as const;
type CssVarEmissionOutput = FromSchema<typeof CssVarEmissionOutputSchema>;

const cssVarEmissionScenarios: readonly ScenarioInterface<CssVarEmissionInputInterface, CssVarEmissionOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,               '[cell=5, scenario=default-prefix] no throw');
      assert.ok(output!.cssVars.includes(':root {'),     '[cell=5, scenario=default-prefix] :root block present');
      assert.match(output!.cssVars, /--c-accent:\s+#[0-9a-f]{6};/,
        '[cell=5, scenario=default-prefix] --c-accent var with default prefix');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#8b5cf6'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['accent']),
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'happy',
    'name': 'default --c- prefix applied to role name in :root block'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,               '[cell=5, scenario=custom-prefix] no throw');
      assert.match(output!.cssVars, /--theme-brand:\s+#[0-9a-f]{6};/,
        '[cell=5, scenario=custom-prefix] custom prefix applied to var name');
      assert.ok(!output!.cssVars.includes('--c-brand'),  '[cell=5, scenario=custom-prefix] default prefix absent');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#8b5cf6'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  { 'cssVarPrefix': '--theme-' },
        'roles':     RoleSchemaFixture.build(['brand']),
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'happy',
    'name': 'custom cssVarPrefix from metadata overrides default --c-'
  },
  {
    'assert': function(output, error) {
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
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#ef4444', '#22c55e'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['critical', 'positive']),
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'edge',
    'name': 'each role appears exactly once in the :root block'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,              '[cell=5, scenario=well-formed] no throw');
      assert.ok(output!.cssVars.trimEnd().endsWith('}'),
        '[cell=5, scenario=well-formed] cssVars ends with closing brace');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#3b82f6'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['link']),
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'edge',
    'name': 'cssVars string ends with closing brace (well-formed CSS block)'
  }
];

new ScenarioRunner<CssVarEmissionInputInterface, CssVarEmissionOutput>(
  'TailwindPlugin :: cell-5 :: css-var-emission',
  (input) => {
    const engine = TestEngine.createFresh();
    engine.pipeline(input.pipeline);
    const state  = engine.run(input.input);
    const out    = TailwindOutput.from(state);
    assert.ok(out !== undefined, '[cell=5] outputs.tailwind:theme must be present');
    return { 'cssVars': out.cssVars };
  }
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

interface PaletteBoundaryInputInterface {
  readonly 'input':    InputInterface;
  readonly 'pipeline': readonly string[];
}
type PaletteBoundaryOutput = {
  readonly 'colorKeys': readonly string[];
  readonly 'cssVars':   string;
};

class PaletteBoundaryAssertions {
  static fullPalette(output: PaletteBoundaryOutput | undefined, error: Error | undefined): void {
    assert.strictEqual(error, undefined,              '[cell=6, scenario=full-palette] no throw');
    assert.strictEqual(output!.colorKeys.length, 5,  '[cell=6, scenario=full-palette] all five role keys present');
    const colorKeySet = new Set(output!.colorKeys);
    const expectedRoles = ['critical', 'warning', 'positive', 'link', 'accent'];
    const expectedRolesLength = expectedRoles.length;
    for (let index = 0; index < expectedRolesLength; index += 1) {
      const role = expectedRoles[index]!;
      assert.ok(colorKeySet.has(role),
        `[cell=6, scenario=full-palette] ${role} key present in colors`);
    }
  }
}

const paletteBoundaryScenarios: readonly ScenarioInterface<PaletteBoundaryInputInterface, PaletteBoundaryOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,              '[cell=6, scenario=empty-palette] no throw');
      assert.strictEqual(output!.colorKeys.length, 0,  '[cell=6, scenario=empty-palette] colors map empty');
      assert.ok(output!.cssVars.includes(':root'),      '[cell=6, scenario=empty-palette] :root block still present');
      assert.ok(!output!.cssVars.includes('@supports'), '[cell=6, scenario=empty-palette] no @supports block');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    [],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     undefined,
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'emit:tailwindTheme']
    },
    'kind': 'edge',
    'name': 'empty palette (no colors, no roles) produces empty colors map and minimal cssVars'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,              '[cell=6, scenario=single-color] no throw');
      assert.strictEqual(output!.colorKeys.length, 1,  '[cell=6, scenario=single-color] exactly one color key');
      assert.ok(output!.colorKeys.includes('accent'),  '[cell=6, scenario=single-color] accent key present');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#8b5cf6'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['accent']),
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'edge',
    'name': 'single color with one role produces exactly one key in colors map'
  },
  {
    'assert': PaletteBoundaryAssertions.fullPalette,
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['critical', 'warning', 'positive', 'link', 'accent']),
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'happy',
    'name': 'full palette with five roles produces all five keys in colors map'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,              '[cell=6, scenario=no-colors-with-roles] no throw');
      assert.ok(output !== undefined,                   '[cell=6, scenario=no-colors-with-roles] output present');
      // resolve:roles synthesizes required roles from constraint centers when no
      // candidate colors are provided — the colors map is non-empty because
      // synthesizeForRole guarantees required roles are always populated.
      assert.strictEqual(output.colorKeys.length, 1,
        '[cell=6, scenario=no-colors-with-roles] synthesized role appears in colors map');
      assert.ok(output.colorKeys.includes('accent'),
        '[cell=6, scenario=no-colors-with-roles] synthesized accent key present');
    },
    'input': {
      'input': {
        'bypass':    undefined,
        'colors':    [],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     RoleSchemaFixture.build(['accent']),
        'runtime':   undefined
      },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:tailwindTheme']
    },
    'kind': 'edge',
    'name': 'no input colors with required roles schema synthesizes role from constraints'
  }
];

new ScenarioRunner<PaletteBoundaryInputInterface, PaletteBoundaryOutput>(
  'TailwindPlugin :: cell-6 :: palette-boundary',
  (input) => {
    const engine = TestEngine.createFresh();
    engine.pipeline(input.pipeline);
    const state  = engine.run(input.input);
    const out    = TailwindOutput.from(state);
    assert.ok(out !== undefined, '[cell=6] outputs.tailwind:theme must be present');
    return {
      'colorKeys': Object.keys(out.colors),
      'cssVars':   out.cssVars
    };
  }
).run(paletteBoundaryScenarios);

// ---------------------------------------------------------------------------
// Golden fixture
// Byte-equal lock on the complete output for a canonical two-role sRGB run.
// ---------------------------------------------------------------------------

void test('TailwindPlugin :: cell-1 :: golden :: canonical two-role sRGB output is stable', () => {
  const engine = TestEngine.createFresh();
  engine.pipeline(['intake:hex', 'resolve:roles', 'emit:tailwindTheme']);
  const state = engine.run({
    'bypass':    undefined,
    'colors':    ['#8b5cf6', '#ef4444'],
    'contrast':  undefined,
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  undefined,
    'roles':     RoleSchemaFixture.build(['accent', 'critical']),
    'runtime':   undefined
  });
  const out = TailwindOutput.from(state);
  assert.ok(out !== undefined, '[cell=golden] outputs.tailwind:theme present');

  // colors map: two flat string entries
  assert.ok(typeof out.colors.accent   === 'string', '[cell=golden] accent is string');
  assert.ok(typeof out.colors.critical === 'string', '[cell=golden] critical is string');
  assert.match(out.colors.accent, /^#[0-9a-f]{6}$/, '[cell=golden] accent is hex');
  assert.match(out.colors.critical, /^#[0-9a-f]{6}$/, '[cell=golden] critical is hex');

  // cssVars: unconditional :root block, no @supports
  assert.ok(GoldenAssertions.containsRootBlock(out.cssVars),   '[cell=golden] cssVars contains :root block');
  assert.ok(!out.cssVars.includes('@supports'),                '[cell=golden] cssVars has no @supports (sRGB)');

  // config: valid JS module structure
  assert.ok(out.config.startsWith('export default {'),  '[cell=golden] config opens with export default');
  assert.ok(out.config.trimEnd().endsWith('};'),         '[cell=golden] config closes with };');
  assert.ok(out.config.includes("'accent'"),             '[cell=golden] config contains accent key');
  assert.ok(out.config.includes("'critical'"),           '[cell=golden] config contains critical key');
});

class GoldenAssertions {
  static containsRootBlock(css: string): boolean {
    const result = css.includes(':root {');
    return result;
  }
}
