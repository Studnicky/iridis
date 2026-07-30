/**
 * Vue-Capacitor example — golden regression suite.
 *
 * Subject: the category-w3c pipeline loaded from the canonical
 * `site/app/examples/vueCapacitor/category-w3c.config.json` through the CLI
 * config boundary and executed end-to-end.
 *
 * Cells:
 *   1. pipeline ordering  — resolve:roles MUST precede expand:family
 *   2. onAccent derivation — derivedFrom role is populated after the fix
 *   3. capacitor output   — flat slots capacitor:statusBar and capacitor:theme
 *   4. css output         — stylesheet:cssVars.full contains expected CSS blocks
 *   5. slot-check         — CLI accepts per-slot flat output.files keys
 */

import type { ColorRecordInterfaceType, PaletteStateInterface } from '@studnicky/iridis/model';
import type { JsonObjectType } from '@studnicky/types';

import { Cli, ConfigLoader } from '@studnicky/iridis-cli';
import { getContrastMetadata } from '@studnicky/iridis-contrast';
import { Engine }    from '@studnicky/iridis/engine';
import { contrastApca, contrastWcag21 } from '@studnicky/iridis/math';
import { coreTasks } from '@studnicky/iridis/tasks';
import { JsonObject, JsonValue } from '@studnicky/types';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir }  from 'node:os';
import { join }    from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

const CATEGORY_CONFIG_PATH = fileURLToPath(new URL(
  '../../../../site/app/examples/vueCapacitor/category-w3c.config.json',
  import.meta.url
));

// ---------------------------------------------------------------------------
// Fixture — shared inputs
// ---------------------------------------------------------------------------

class VueCapacitorTestFixture {
  static async buildEngine(): Promise<Engine> {
    const { contrastPlugin }   = await import('@studnicky/iridis-contrast');
    const { stylesheetPlugin } = await import('@studnicky/iridis-stylesheet');
    const { capacitorPlugin }  = await import('@studnicky/iridis-capacitor');

    const engine = new Engine();
    for (const task of coreTasks) {
      engine.tasks.register(task);
    }
    engine.adopt(contrastPlugin);
    engine.adopt(stylesheetPlugin);
    engine.adopt(capacitorPlugin);

    return engine;
  }

  static objectOutput(state: PaletteStateInterface, key: string): JsonObjectType {
    const output = state.outputs[key];
    if (!JsonObject.is(output)) {
      throw new Error(`Expected object output at ${key}`);
    }
    return output;
  }

  static requireOutput<T>(output: T | undefined, error: Error | undefined, message: string): T {
    assert.strictEqual(error, undefined, `${message}: no error`);
    if (output === undefined) {
      assert.fail(`${message}: output is defined`);
    }
    return output;
  }

  static requireRole(state: PaletteStateInterface, name: string): ColorRecordInterfaceType {
    const role = state.roles[name];
    if (role === undefined) {
      throw new Error(`Expected resolved role ${name}.`);
    }
    return role;
  }

  static async runPipeline(pipelineOrder?: readonly string[]): Promise<PaletteStateInterface> {
    const config = await new ConfigLoader().load(CATEGORY_CONFIG_PATH);
    const engine = await VueCapacitorTestFixture.buildEngine();
    engine.pipeline([...(pipelineOrder ?? config.pipeline)]);
    return engine.run(config.input);
  }

  static async temporaryDirectory(): Promise<string> {
    const result = await mkdtemp(join(tmpdir(), 'iridis-vc-e2e-'));
    return result;
  }

  static async typeScriptSchema(): Promise<JsonObjectType> {
    const schemaModule = JsonValue.from(JSON.parse(JSON.stringify(await import(new URL(
      '../../../../site/app/examples/vueCapacitor/categoryW3cRoleSchema.ts',
      import.meta.url
    ).href))));
    if (!JsonObject.is(schemaModule)) {
      throw new TypeError('The canonical Vue Capacitor TypeScript schema module is invalid.');
    }
    const schema = schemaModule.categoryW3cRoleSchema;
    if (!JsonObject.is(schema)) {
      throw new TypeError('The canonical Vue Capacitor TypeScript schema is invalid.');
    }
    return schema;
  }

  static async jsonDocument(relativePath: string): Promise<JsonObjectType> {
    const value = JsonValue.from(JSON.parse(
      await readFile(new URL(relativePath, import.meta.url), 'utf8')
    ));
    if (!JsonObject.is(value)) {
      throw new TypeError(`${relativePath} must contain a JSON object.`);
    }
    return value;
  }

  static misorderedPipeline(pipeline: readonly string[]): string[] {
    const result = [...pipeline];
    const resolveIndex = result.indexOf('resolve:roles');
    const expandIndex = result.indexOf('expand:family');
    if (resolveIndex < 0 || expandIndex < 0) {
      throw new Error('Canonical pipeline must contain resolve:roles and expand:family.');
    }
    result[resolveIndex] = 'expand:family';
    result[expandIndex] = 'resolve:roles';
    return result;
  }
}

await test('Vue Capacitor CLI consumes structurally aligned canonical JSON artifacts', async () => {
  const config = await new ConfigLoader().load(CATEGORY_CONFIG_PATH);
  const schemaDocument = await VueCapacitorTestFixture.jsonDocument(
    '../../../../site/app/examples/vueCapacitor/categoryW3cRoleSchema.json'
  );
  assert.deepEqual(schemaDocument, await VueCapacitorTestFixture.typeScriptSchema());
  const serializedConfigRoles = JsonValue.from(JSON.parse(JSON.stringify(config.input.roles)));
  assert.deepEqual(serializedConfigRoles, schemaDocument);
  const contrastPairs = config.input.roles?.contrastPairs;
  const apcaPairs = config.input.contrast?.extra;
  if (contrastPairs === undefined || apcaPairs === undefined) {
    throw new Error('The canonical CLI config must declare role and APCA contrast pairs.');
  }
  assert.deepEqual(apcaPairs, [
    { 'algorithm': 'apca', 'background': 'canvas', 'foreground': 'text', 'minRatio': 75 },
    { 'algorithm': 'apca', 'background': 'surface', 'foreground': 'text', 'minRatio': 75 },
    { 'algorithm': 'apca', 'background': 'accent', 'foreground': 'onAccent', 'minRatio': 60 },
    { 'algorithm': 'apca', 'background': 'canvas', 'foreground': 'border', 'minRatio': 45 }
  ]);

  const state = await VueCapacitorTestFixture.runPipeline();
  assert.equal(getContrastMetadata(state.metadata, 'contrast:aa')?.pairs.length, 4);
  assert.equal(getContrastMetadata(state.metadata, 'contrast:aaa')?.pairs.length, 4);
  assert.equal(getContrastMetadata(state.metadata, 'contrast:apca')?.pairs.length, 4);
  const cvd = getContrastMetadata(state.metadata, 'contrast:cvd');
  assert.ok(cvd !== undefined);
  assert.equal(cvd.warnings.length, 0);
  assert.equal(cvd.corrections?.every((correction) => {
    return correction.cvdTypesRemaining.length === 0;
  }), true);
  for (const pair of contrastPairs) {
    const actualRatio = contrastWcag21.apply(
      VueCapacitorTestFixture.requireRole(state, pair.foreground),
      VueCapacitorTestFixture.requireRole(state, pair.background)
    );
    assert.ok(actualRatio >= pair.minRatio, `${pair.foreground}/${pair.background}: ${actualRatio}`);
  }
  for (const pair of apcaPairs) {
    const actualLc = Math.abs(contrastApca.apply(
      VueCapacitorTestFixture.requireRole(state, pair.foreground),
      VueCapacitorTestFixture.requireRole(state, pair.background)
    ));
    assert.ok(actualLc >= pair.minRatio, `${pair.foreground}/${pair.background}: ${actualLc}`);
  }
});

// ---------------------------------------------------------------------------
// Cell 1 — pipeline ordering: resolve:roles must precede expand:family
//
// When expand:family runs before resolve:roles, state.roles is empty and
// all derivedFrom roles are silently skipped. The onAccent role (derived
// from accent) will be missing from the output entirely.
// ---------------------------------------------------------------------------

abstract class PipelineOrderInput {
  abstract readonly 'misordered': boolean;
}
type PipelineOrderOutput = {
  readonly 'hasOnAccent':   boolean;
  readonly 'roleNames':     string[];
};

const pipelineOrderScenarios: readonly ScenarioInterface<PipelineOrderInput, PipelineOrderOutput>[] = [
  {
    'assert': function(output, error) {
      const result = VueCapacitorTestFixture.requireOutput(
        output,
        error,
        '[cell=1, scenario=correct-order]'
      );
      assert.ok(result.hasOnAccent,
        '[cell=1, scenario=correct-order] onAccent role is present');
      assert.ok(result.roleNames.includes('accent'),
        '[cell=1, scenario=correct-order] accent role is present');
    },
    'input': { 'misordered': false },
    'kind': 'happy',
    'name': 'correct order (resolve before expand) produces onAccent role'
  },
  {
    'assert': function(output, error) {
      const result = VueCapacitorTestFixture.requireOutput(
        output,
        error,
        '[cell=1, scenario=wrong-order]'
      );
      assert.strictEqual(result.hasOnAccent, false,
        '[cell=1, scenario=wrong-order] onAccent is absent when expand runs before resolve');
    },
    'input': { 'misordered': true },
    'kind': 'unhappy',
    'name': 'wrong order (expand before resolve) silently drops onAccent'
  }
];

await new ScenarioRunner<PipelineOrderInput, PipelineOrderOutput>(
  'VueCapacitor :: cell-1 :: pipeline-ordering',
  async (input) => {
    const config = await new ConfigLoader().load(CATEGORY_CONFIG_PATH);
    const pipeline = input.misordered
      ? VueCapacitorTestFixture.misorderedPipeline(config.pipeline)
      : config.pipeline;
    const state = await VueCapacitorTestFixture.runPipeline(pipeline);
    return {
      'hasOnAccent': 'onAccent' in state.roles,
      'roleNames':   Object.keys(state.roles)
    };
  }
).run(pipelineOrderScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — onAccent derivation
//
// With the correct pipeline order, onAccent is derived from the accent role
// and pushed toward lightness [0.98, 1.0] by expand:family. The accent's
// schema range ensures that the pair meets 7:1 after WCAG enforcement.
// ---------------------------------------------------------------------------

interface OnAccentInputInterface { readonly 'unused'?: never }
abstract class OnAccentOutput {
  abstract readonly 'accentHex':         string;
  abstract readonly 'contrastRatio':     number;
  abstract readonly 'onAccentHex':       string;
  abstract readonly 'onAccentLightness': number;
}

const onAccentScenarios: readonly ScenarioInterface<OnAccentInputInterface, OnAccentOutput>[] = [
  {
    'assert': function(output, error) {
      const result = VueCapacitorTestFixture.requireOutput(
        output,
        error,
        '[cell=2, scenario=derived]'
      );
      assert.ok(/^#[0-9a-f]{6}$/i.test(result.onAccentHex),
        '[cell=2, scenario=derived] onAccent is a valid 6-digit hex');
      assert.ok(result.onAccentLightness >= 0.98,
        `[cell=2, scenario=derived] onAccent lightness ${result.onAccentLightness.toFixed(3)} should be ≥ 0.98 (declared high-lightness range)`);
      assert.ok(result.contrastRatio >= 7,
        `[cell=2, scenario=derived] onAccent/accent contrast ${result.contrastRatio.toFixed(3)} should be ≥ 7`);
    },
    'input': {},
    'kind': 'happy',
    'name': 'onAccent is a light color (L >= 0.98) derived from accent'
  },
  {
    'assert': async function(output, error) {
      const result = VueCapacitorTestFixture.requireOutput(
        output,
        error,
        '[cell=2, scenario=deterministic]'
      );
      const secondState = await VueCapacitorTestFixture.runPipeline();
      const secondOnAccent = VueCapacitorTestFixture.requireRole(secondState, 'onAccent');
      assert.strictEqual(result.onAccentHex, secondOnAccent.hex,
        '[cell=2, scenario=deterministic] onAccent hex is identical across runs');
    },
    'input': {},
    'kind': 'edge',
    'name': 'onAccent hex is stable across runs (deterministic)'
  }
];

await new ScenarioRunner<OnAccentInputInterface, OnAccentOutput>(
  'VueCapacitor :: cell-2 :: onAccent-derivation',
  async () => {
    const state = await VueCapacitorTestFixture.runPipeline();
    const onAccent = VueCapacitorTestFixture.requireRole(state, 'onAccent');
    const accent   = VueCapacitorTestFixture.requireRole(state, 'accent');
    return {
      'accentHex':         accent.hex,
      'contrastRatio':     contrastWcag21.apply(onAccent, accent),
      'onAccentHex':       onAccent.hex,
      'onAccentLightness': onAccent.oklch.l
    };
  }
).run(onAccentScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — capacitor output shape
//
// After the correct pipeline, state.outputs['capacitor:statusBar'] and
// state.outputs['capacitor:theme'] are written as flat top-level slots.
// ---------------------------------------------------------------------------

interface CapacitorOutputInputInterface { readonly 'unused'?: never }
abstract class CapacitorOutputOutput {
  abstract readonly 'hasStatusBar':   boolean;
  abstract readonly 'hasTheme':       boolean;
  abstract readonly 'primaryHex':     string;
  abstract readonly 'statusBarStyle': string;
  abstract readonly 'themeKeyCount':  number;
}

const capacitorOutputScenarios: readonly ScenarioInterface<CapacitorOutputInputInterface, CapacitorOutputOutput>[] = [
  {
    'assert': function(output, error) {
      const result = VueCapacitorTestFixture.requireOutput(output, error, '[cell=3, scenario=shape]');
      assert.ok(result.hasStatusBar,  '[cell=3, scenario=shape] statusBar present');
      assert.ok(result.hasTheme,      '[cell=3, scenario=shape] theme present');
    },
    'input': {},
    'kind': 'happy',
    'name': 'capacitor output has statusBar and theme sub-objects'
  },
  {
    'assert': function(output, error) {
      const result = VueCapacitorTestFixture.requireOutput(output, error, '[cell=3, scenario=status-style]');
      assert.ok(
        result.statusBarStyle === 'DARK' || result.statusBarStyle === 'LIGHT',
        `[cell=3, scenario=status-style] style is DARK|LIGHT, got ${result.statusBarStyle}`
      );
    },
    'input': {},
    'kind': 'happy',
    'name': 'statusBar style is DARK or LIGHT'
  },
  {
    'assert': function(output, error) {
      const result = VueCapacitorTestFixture.requireOutput(output, error, '[cell=3, scenario=theme-keys]');
      assert.strictEqual(result.themeKeyCount, 13,
        `[cell=3, scenario=theme-keys] expected 13 theme keys, got ${result.themeKeyCount}`);
    },
    'input': {},
    'kind': 'happy',
    'name': 'theme has all 13 canonical slots'
  },
  {
    'assert': function(output, error) {
      const result = VueCapacitorTestFixture.requireOutput(output, error, '[cell=3, scenario=theme-hex]');
      assert.ok(/^#[0-9a-f]{6}$/i.test(result.primaryHex),
        `[cell=3, scenario=theme-hex] primary is hex, got ${result.primaryHex}`);
    },
    'input': {},
    'kind': 'edge',
    'name': 'theme primary slot is a hex string'
  }
];

await new ScenarioRunner<CapacitorOutputInputInterface, CapacitorOutputOutput>(
  'VueCapacitor :: cell-3 :: capacitor-output',
  async () => {
    const state     = await VueCapacitorTestFixture.runPipeline();
    const statusBar = VueCapacitorTestFixture.objectOutput(state, 'capacitor:statusBar');
    const theme     = VueCapacitorTestFixture.objectOutput(state, 'capacitor:theme');
    const primary = theme.primary;
    const style = statusBar.style;
    return {
      'hasStatusBar':   true,
      'hasTheme':       true,
      'primaryHex':     typeof primary === 'string' ? primary : '',
      'statusBarStyle': typeof style === 'string' ? style : '',
      'themeKeyCount':  Object.keys(theme).length
    };
  }
).run(capacitorOutputScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — CSS output
//
// emit:cssVars writes state.outputs['stylesheet:cssVars'].full. With the
// music seed and the category-w3c schema, we expect a :root block and a
// dark-scheme media query (dark variants from derive:variant).
// ---------------------------------------------------------------------------

interface CssOutputInputInterface { readonly 'unused'?: never }
abstract class CssOutputOutput {
  abstract readonly 'allRolesPresent': boolean;
  abstract readonly 'hasDarkScheme':   boolean;
  abstract readonly 'hasForcedColors': boolean;
  abstract readonly 'hasRootBlock':    boolean;
}

const cssOutputScenarios: readonly ScenarioInterface<CssOutputInputInterface, CssOutputOutput>[] = [
  {
    'assert': function(output, error) {
      const result = VueCapacitorTestFixture.requireOutput(
        output,
        error,
        '[cell=4, scenario=root-block]'
      );
      assert.ok(result.hasRootBlock,
        '[cell=4, scenario=root-block] full CSS contains :root');
    },
    'input': {},
    'kind': 'happy',
    'name': 'full CSS output contains :root block'
  },
  {
    'assert': function(output, error) {
      const result = VueCapacitorTestFixture.requireOutput(
        output,
        error,
        '[cell=4, scenario=dark-scheme]'
      );
      assert.ok(result.hasDarkScheme,
        '[cell=4, scenario=dark-scheme] @media prefers-color-scheme: dark present');
    },
    'input': {},
    'kind': 'happy',
    'name': 'dark-scheme media query is present (derive:variant produced dark variants)'
  },
  {
    'assert': function(output, error) {
      const result = VueCapacitorTestFixture.requireOutput(
        output,
        error,
        '[cell=4, scenario=forced-colors]'
      );
      assert.ok(result.hasForcedColors,
        '[cell=4, scenario=forced-colors] @media forced-colors: active present');
    },
    'input': {},
    'kind': 'happy',
    'name': 'forced-colors media query is present'
  },
  {
    'assert': function(output, error) {
      const result = VueCapacitorTestFixture.requireOutput(
        output,
        error,
        '[cell=4, scenario=all-roles]'
      );
      assert.ok(result.allRolesPresent,
        '[cell=4, scenario=all-roles] all seven role names appear as --c-* vars in :root');
    },
    'input': {},
    'kind': 'happy',
    'name': 'all seven declared roles appear as CSS custom properties'
  }
];

await new ScenarioRunner<CssOutputInputInterface, CssOutputOutput>(
  'VueCapacitor :: cell-4 :: css-output',
  async () => {
    const state   = await VueCapacitorTestFixture.runPipeline();
    const cssVars = VueCapacitorTestFixture.objectOutput(state, 'stylesheet:cssVars');
    const full    = typeof cssVars.full === 'string' ? cssVars.full : '';
    const root    = typeof cssVars.rootBlock === 'string' ? cssVars.rootBlock : '';
    const roles = state.input.roles;
    if (roles === undefined) {
      throw new Error('The canonical Vue Capacitor config must declare roles.');
    }

    const allRolesPresent = roles.roles.every(
      (role) => {return root.includes(`--c-${role.name.replace(/([A-Z])/g, '-$1').toLowerCase()}`) ||
             root.includes(`--c-${role.name}`);}
    );

    return {
      'allRolesPresent': allRolesPresent,
      'hasDarkScheme':   full.includes('prefers-color-scheme: dark'),
      'hasForcedColors': full.includes('forced-colors: active'),
      'hasRootBlock':    full.includes(':root')
    };
  }
).run(cssOutputScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — slot-check accepts per-slot flat output.files keys
//
// With the colon-flat grammar, each capacitor task writes a distinct top-level
// slot ('capacitor:statusBar', 'capacitor:theme'). Cli.run must accept output
// files that map those exact slot keys, and must also accept the
// 'stylesheet:cssVars' key. No legacy sub-slot path normalisation is needed.
// ---------------------------------------------------------------------------

abstract class SlotCheckInput {
  abstract readonly 'outputFiles': Record<string, string>;
}
abstract class SlotCheckOutput {
  abstract readonly 'success': boolean;
}

const slotCheckScenarios: readonly ScenarioInterface<SlotCheckInput, SlotCheckOutput>[] = [
  {
    'assert': function(_output, error) {
      assert.strictEqual(error, undefined,
        '[cell=5, scenario=flat-slots] CLI accepts per-slot flat output keys');
    },
    'input': {
      'outputFiles': {
        'capacitor:statusBar': 'music-statusbar.json',
        'capacitor:theme':     'music-theme.json',
        'stylesheet:cssVars':  'music.css'
      }
    },
    'kind': 'happy',
    'name': 'per-slot capacitor keys accepted by slot-check'
  },
  {
    'assert': function(_output, error) {
      assert.strictEqual(error, undefined,
        '[cell=5, scenario=css-only] stylesheet:cssVars output accepted by slot-check');
    },
    'input': {
      'outputFiles': { 'stylesheet:cssVars': 'music.css' }
    },
    'kind': 'happy',
    'name': 'stylesheet:cssVars-only output key passes slot-check'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error,
        '[cell=5, scenario=unknown-slot] CLI throws for unknown slot key');
      assert.match((error).message, /Config error/,
        '[cell=5, scenario=unknown-slot] error is a config-level rejection');
      assert.match((error).message, /ghost:slot/,
        '[cell=5, scenario=unknown-slot] error names the unresolved slot key');
    },
    'input': {
      'outputFiles': { 'ghost:slot': 'missing.json', 'stylesheet:cssVars': 'music.css' }
    },
    'kind': 'unhappy',
    'name': 'unknown slot key rejected by slot-check'
  }
];

await new ScenarioRunner<SlotCheckInput, SlotCheckOutput>(
  'VueCapacitor :: cell-5 :: slot-check-drift',
  async (input) => {
    const dir  = await VueCapacitorTestFixture.temporaryDirectory();
    const outDir = join(dir, 'out');
    try {
      const config = await VueCapacitorTestFixture.jsonDocument(
        '../../../../site/app/examples/vueCapacitor/category-w3c.config.json'
      );
      config.output = {
        'directory': outDir,
        'files':     input.outputFiles
      };
      const configPath = join(dir, 'iridis.config.json');
      await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
      await new Cli().run(configPath);
      return { 'success': true };
    } finally {
      await rm(dir, { 'force': true, 'recursive': true });
    }
  }
).run(slotCheckScenarios);
