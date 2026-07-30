/**
 * Pipeline.composition.e2e — scenario-matrix suite.
 *
 * Subject: multi-stage pipeline correctness with real coreTasks.
 * Covers hint-driven role assignment, variant derivation, contrast reporting,
 * idempotency, and empty/absent-schema edge cases.
 *
 * Cells:
 *   1. role-assignment    — distance-based and hint-driven assignment paths
 *   2. derive-variant     — dark/light maps produced, lightness inversion invariant
 *   3. contrast-report    — contrastReport shape, populated correctly
 *   4. idempotency        — double enforce:contrast is a no-op on second pass
 *   5. empty-schema       — empty roles list and absent roles field handled cleanly
 */

import type {
  ColorRecordInterfaceType,
  ContrastReportEntryInterfaceType,
  InputInterface,
  PaletteStateInterface,
  RoleSchemaInterfaceType
} from '@studnicky/iridis';

import { Engine }    from '@studnicky/iridis';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

type JsonOutput = {
  'colors':   string[];
  'roles':    Record<string, string>;
  'variants': Record<string, Record<string, string>>;
};

class PipelineFixtures {
  static freshEngine(): Engine {
    const engine = new Engine();
    for (const t of coreTasks) { engine.tasks.register(t); }
    return engine;
  }

  static makeHintedRecord(
    l: number, c: number, h: number,
    r: number, g: number, b: number,
    hex: string,
    role: string
  ): ColorRecordInterfaceType {
    return {
      'alpha':        1,
      'displayP3':    undefined,
      'hex': hex,
      'hints':        { 'intent': undefined, 'role': role, 'weight': undefined },
      'oklch':        { 'c': c, 'h': h, 'l': l },
      'rgb':          { 'b': b, 'g': g, 'r': r },
      'sourceFormat': 'hex'
    };
  }

  static seedHintedColors(state: PaletteStateInterface): void {
    state.colors.push(hintedAccent, hintedSurface);
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — role assignment: distance-based and hint-driven
//
// When hex strings (no hints) are supplied, resolve:roles assigns roles via
// OKLCH distance matching. When a color carries hints.role the matching is
// exact — the role receives the exact same object reference (no clone).
// ---------------------------------------------------------------------------

const hintedAccent  = PipelineFixtures.makeHintedRecord(0.6, 0.15, 250, 0.3, 0.2, 0.8, '#4d33cc', 'accent');
const hintedSurface = PipelineFixtures.makeHintedRecord(0.95, 0.01, 0, 0.95, 0.95, 0.95, '#f2f2f2', 'surface');

const hintSchema: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description': undefined, 'name': 'hint-schema', 'roles': [
    { 'chromaRange': undefined,  'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'accent', 'required': true },
    { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'surface', 'required': true }
  ]
};

const distanceSchema: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description': undefined, 'name': 'hint-test', 'roles': [
    { 'chromaRange': undefined,  'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'accent', 'required': true },
    { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'surface', 'required': true },
    { 'chromaRange': undefined,    'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'text', 'required': false }
  ]
};

const roleAssignmentScenarios: readonly ScenarioInterface<{ readonly 'mode': 'distance' | 'hint' }, {
  readonly 'accentIsRef': boolean;   // only meaningful in hint mode
  readonly 'hasAccent':   boolean;
  readonly 'hasSurface':  boolean;
  readonly 'hasText':     boolean;
  readonly 'surfaceIsRef': boolean;  // only meaningful in hint mode
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,           '[cell=1, scenario=distance] no throw');
      assert.strictEqual(output!.hasAccent,   true,  '[cell=1, scenario=distance] accent assigned');
      assert.strictEqual(output!.hasSurface,  true,  '[cell=1, scenario=distance] surface assigned');
      assert.strictEqual(output!.hasText,     true,  '[cell=1, scenario=distance] text assigned');
    },
    'input': { 'mode': 'distance' },
    'kind': 'happy',
    'name': 'hex-string input resolves all three roles via distance matching'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,            '[cell=1, scenario=hint] no throw');
      assert.strictEqual(output!.hasAccent,   true,   '[cell=1, scenario=hint] accent assigned');
      assert.strictEqual(output!.hasSurface,  true,   '[cell=1, scenario=hint] surface assigned');
      assert.strictEqual(output!.accentIsRef,  true,  '[cell=1, scenario=hint] accent is exact hinted reference');
      assert.strictEqual(output!.surfaceIsRef, true,  '[cell=1, scenario=hint] surface is exact hinted reference');
    },
    'input': { 'mode': 'hint' },
    'kind': 'happy',
    'name': 'hint.role causes exact (reference-equal) role assignment'
  }
];

new ScenarioRunner<{ readonly 'mode': 'distance' | 'hint' }, {
  readonly 'accentIsRef': boolean;
  readonly 'hasAccent':   boolean;
  readonly 'hasSurface':  boolean;
  readonly 'hasText':     boolean;
  readonly 'surfaceIsRef': boolean;
}>(
  'Pipeline.composition :: cell-1 :: role-assignment',
  (input) => {
    if (input.mode === 'distance') {
      const engine = PipelineFixtures.freshEngine();
      engine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'emit:json']);
      // Three colors with distinct lightness so each role resolves via distance
      const state = engine.run({
        'bypass': undefined,
        'colors': ['#6d28d9', '#f5f3ff', '#1c1917'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles':  distanceSchema, 'runtime': undefined
      });
      return {
        'accentIsRef':  false,
        'hasAccent':   'accent'  in state.roles,
        'hasSurface':  'surface' in state.roles,
        'hasText':     'text'    in state.roles,
        'surfaceIsRef': false
      };
    }

    // hint mode: seed state directly via onRunStart hook
    const engine = PipelineFixtures.freshEngine();
    engine.tasks.hook('onRunStart', {
      'manifest': { 'description': undefined, 'name': 'seed:hinted', 'phase': 'onRunStart', 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'seed:hinted',
      'run': PipelineFixtures.seedHintedColors
    });
    engine.pipeline(['resolve:roles', 'expand:family', 'emit:json']);

    const state = engine.run({ 'bypass': undefined, 'colors': [], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': hintSchema, 'runtime': undefined });
    return {
      'accentIsRef':  state.roles.accent  === hintedAccent,
      'hasAccent':    'accent'  in state.roles,
      'hasSurface':   'surface' in state.roles,
      'hasText':      false,
      'surfaceIsRef': state.roles.surface === hintedSurface
    };
  }
).run(roleAssignmentScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — derive:variant produces dark and light maps over all roles
//
// state.variants must have keys 'dark' and 'light'. Each variant must contain
// exactly as many entries as state.roles. Dark L should approximate (1 - primary L).
// emit:json must capture the variants in its output.
// ---------------------------------------------------------------------------

const variantSchema: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description': undefined, 'name':  'variant-test', 'roles': [
    { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'primary', 'required': true },
    { 'chromaRange': undefined,   'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'muted', 'required': true }
  ]
};

type VariantInput =  { readonly 'colors': string[] };

const variantScenarios: readonly ScenarioInterface<VariantInput, {
  readonly 'darkPrimaryL':   number;
  readonly 'darkRoleCount':  number;
  readonly 'hasDark':        boolean;
  readonly 'hasLight':       boolean;
  readonly 'jsonHasDark':    boolean;
  readonly 'jsonHasLight':   boolean;
  readonly 'lightRoleCount': number;
  readonly 'primaryL':       number;
  readonly 'stateRoleCount': number;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                             '[cell=2, scenario=two-seeds] no throw');
      assert.strictEqual(output!.hasDark,  true,                      '[cell=2, scenario=two-seeds] variants.dark exists');
      assert.strictEqual(output!.hasLight, true,                      '[cell=2, scenario=two-seeds] variants.light exists');
      assert.strictEqual(
        output!.darkRoleCount, output!.stateRoleCount,
        '[cell=2, scenario=two-seeds] dark variant count matches role count'
      );
      assert.strictEqual(
        output!.lightRoleCount, output!.stateRoleCount,
        '[cell=2, scenario=two-seeds] light variant count matches role count'
      );
      const eps = 0.05;
      assert.ok(
        Math.abs(output!.darkPrimaryL - (1 - output!.primaryL)) < eps,
        `[cell=2, scenario=two-seeds] dark.primary.L ≈ 1 - primary.L; got ${output!.darkPrimaryL}`
      );
      assert.strictEqual(output!.jsonHasDark,  true, '[cell=2, scenario=two-seeds] json.variants.dark present');
      assert.strictEqual(output!.jsonHasLight, true, '[cell=2, scenario=two-seeds] json.variants.light present');
    },
    'input': { 'colors': ['#6366f1', '#a5b4fc'] },
    'kind': 'happy',
    'name': 'two seeds produce dark and light variants with matching role counts'
  }
];

new ScenarioRunner<VariantInput, {
  readonly 'darkPrimaryL':   number;
  readonly 'darkRoleCount':  number;
  readonly 'hasDark':        boolean;
  readonly 'hasLight':       boolean;
  readonly 'jsonHasDark':    boolean;
  readonly 'jsonHasLight':   boolean;
  readonly 'lightRoleCount': number;
  readonly 'primaryL':       number;
  readonly 'stateRoleCount': number;
}>(
  'Pipeline.composition :: cell-2 :: derive-variant',
  (input) => {
    const engine = PipelineFixtures.freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles', 'derive:variant', 'emit:json']);
    const state = engine.run({ 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': variantSchema, 'runtime': undefined });
    const dark  = state.variants.dark;
    const light = state.variants.light;
    const json  = state.outputs['core:json']   as JsonOutput | undefined;
    return {
      'darkPrimaryL':   dark?.primary?.oklch.l ?? -1,
      'darkRoleCount':  Object.keys(dark  ?? {}).length,
      'hasDark':        'dark'  in state.variants,
      'hasLight':       'light' in state.variants,
      'jsonHasDark':    json !== undefined && 'dark'  in json.variants,
      'jsonHasLight':   json !== undefined && 'light' in json.variants,
      'lightRoleCount': Object.keys(light ?? {}).length,
      'primaryL':       state.roles.primary?.oklch.l ?? 0,
      'stateRoleCount': Object.keys(state.roles).length
    };
  }
).run(variantScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — contrastReport shape and content
//
// enforce:contrast must write a contrastReport array into state.metadata.
// Each entry must have foreground, background, ratio, minRatio, passed, adjusted.
// ---------------------------------------------------------------------------

const contrastReportSchema: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': undefined, 'background': 'surface', 'foreground': 'text', 'minRatio': 3.0 }
  ],
  'description': undefined,
  'name': 'contrast-report-test', 'roles': [
    { 'chromaRange': undefined,    'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'text', 'required': true },
    { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'surface', 'required': true }
  ]
};

const contrastReportScenarios: readonly ScenarioInterface<{ readonly 'bgHex': string; readonly 'fgHex': string; }, {
  readonly 'adjustedIsBool': boolean;
  readonly 'background':     string;
  readonly 'foreground':     string;
  readonly 'minRatioIsNum':  boolean;
  readonly 'passedIsBool':   boolean;
  readonly 'ratioIsNumber':  boolean;
  readonly 'reportLength':   number;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                           '[cell=3, scenario=report-shape] no throw');
      assert.strictEqual(output!.reportLength,   1,                  '[cell=3, scenario=report-shape] one entry for one pair');
      assert.strictEqual(output!.foreground,  'text',                '[cell=3, scenario=report-shape] foreground is "text"');
      assert.strictEqual(output!.background,  'surface',             '[cell=3, scenario=report-shape] background is "surface"');
      assert.strictEqual(output!.ratioIsNumber,   true,              '[cell=3, scenario=report-shape] ratio is a number');
      assert.strictEqual(output!.minRatioIsNum,   true,              '[cell=3, scenario=report-shape] minRatio is a number');
      assert.strictEqual(output!.passedIsBool,    true,              '[cell=3, scenario=report-shape] passed is boolean');
      assert.strictEqual(output!.adjustedIsBool,  true,              '[cell=3, scenario=report-shape] adjusted is boolean');
    },
    'input': { 'bgHex': '#eeeeff', 'fgHex': '#1a1a2e' },
    'kind': 'happy',
    'name': 'high-contrast pair produces one-entry report with correct field types'
  }
];

new ScenarioRunner<{ readonly 'bgHex': string; readonly 'fgHex': string; }, {
  readonly 'adjustedIsBool': boolean;
  readonly 'background':     string;
  readonly 'foreground':     string;
  readonly 'minRatioIsNum':  boolean;
  readonly 'passedIsBool':   boolean;
  readonly 'ratioIsNumber':  boolean;
  readonly 'reportLength':   number;
}>(
  'Pipeline.composition :: cell-3 :: contrast-report',
  (input) => {
    const engine = PipelineFixtures.freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles', 'enforce:contrast']);
    const state = engine.run({
      'bypass': undefined,
      'colors': [input.fgHex, input.bgHex], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles':  contrastReportSchema, 'runtime': undefined
    });
    const report = state.metadata['core:contrastReport'] as ContrastReportEntryInterfaceType[] | undefined;
    const entry  = Array.isArray(report) ? report[0] : undefined;
    return {
      'adjustedIsBool': typeof entry?.adjusted === 'boolean',
      'background':     entry?.background     ?? '',
      'foreground':     entry?.foreground     ?? '',
      'minRatioIsNum':  typeof entry?.minRatio === 'number',
      'passedIsBool':   typeof entry?.passed   === 'boolean',
      'ratioIsNumber':  typeof entry?.ratio    === 'number',
      'reportLength':   Array.isArray(report) ? report.length : 0
    };
  }
).run(contrastReportScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — double enforce:contrast is idempotent
//
// Running enforce:contrast twice must leave the final report's adjusted field
// as false: the second run sees a pair that already passes and must not
// re-adjust it.
// ---------------------------------------------------------------------------

const idempotentSchema: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': undefined, 'background': 'surface', 'foreground': 'text', 'minRatio': 4.5 }
  ],
  'description': undefined,
  'name': 'idempotent-test', 'roles': [
    { 'chromaRange': undefined,      'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'text', 'required': true },
    { 'chromaRange': undefined,   'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'surface', 'required': true },
    { 'chromaRange': [0.01, 0.05], 'derivedFrom': 'text', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'text-muted', 'required': undefined }
  ]
};

const idempotentScenarios: readonly ScenarioInterface<{ readonly 'bgHex': string; readonly 'fgHex': string; }, {
  readonly 'lastEntryAdjusted': boolean; readonly 'reportIsArray': boolean
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                              '[cell=4, scenario=idempotent] no throw');
      assert.strictEqual(output!.reportIsArray,        true,           '[cell=4, scenario=idempotent] contrastReport is array');
      assert.strictEqual(output!.lastEntryAdjusted,    false,          '[cell=4, scenario=idempotent] second enforce is no-op');
    },
    'input': { 'bgHex': '#f0f0f0', 'fgHex': '#111111' },
    'kind': 'happy',
    'name': 'second enforce:contrast does not adjust an already-passing pair'
  }
];

new ScenarioRunner<{ readonly 'bgHex': string; readonly 'fgHex': string; }, {
  readonly 'lastEntryAdjusted': boolean; readonly 'reportIsArray': boolean
}>(
  'Pipeline.composition :: cell-4 :: idempotency',
  (input) => {
    const engine = PipelineFixtures.freshEngine();
    engine.pipeline([
      'intake:hex', 'resolve:roles', 'enforce:contrast',
      'expand:family', 'enforce:contrast', 'emit:json'
    ]);
    const state  = engine.run({ 'bypass': undefined, 'colors': [input.fgHex, input.bgHex], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': idempotentSchema, 'runtime': undefined });
    const report = state.metadata['core:contrastReport'] as ContrastReportEntryInterfaceType[] | undefined;
    const last   = Array.isArray(report) && report.length > 0 ? report[report.length - 1] : undefined;
    return {
      'lastEntryAdjusted': last?.adjusted ?? false,
      'reportIsArray':     Array.isArray(report)
    };
  }
).run(idempotentScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — empty or absent role schema
//
// An empty roles list (schema present but roles=[]) must produce empty
// state.roles and state.variants. An absent roles field must also return
// cleanly. In both cases emit:json still writes and colors are parsed normally.
// ---------------------------------------------------------------------------

type EmptySchemaInput = {
  readonly 'colors': string[];
  readonly 'mode': 'empty-list' | 'no-schema';
};

const emptySchemaScenarios: readonly ScenarioInterface<EmptySchemaInput, {
  readonly 'colorsLength':  number;
  readonly 'jsonOk':        boolean;
  readonly 'rolesEmpty':    boolean;
  readonly 'variantsEmpty': boolean;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                     '[cell=5, scenario=empty-list] no throw');
      assert.strictEqual(output!.rolesEmpty,    true,          '[cell=5, scenario=empty-list] state.roles is empty');
      assert.strictEqual(output!.variantsEmpty, true,          '[cell=5, scenario=empty-list] state.variants is empty');
      assert.strictEqual(output!.colorsLength,  2,             '[cell=5, scenario=empty-list] colors still parsed');
      assert.strictEqual(output!.jsonOk,        true,          '[cell=5, scenario=empty-list] emit:json succeeds');
    },
    'input': { 'colors': ['#ff0000', '#00ff00'], 'mode': 'empty-list' },
    'kind': 'edge',
    'name': 'empty roles list produces empty state.roles and state.variants'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                     '[cell=5, scenario=no-schema] no throw');
      assert.strictEqual(output!.rolesEmpty,    true,          '[cell=5, scenario=no-schema] state.roles is empty');
      assert.strictEqual(output!.variantsEmpty, true,          '[cell=5, scenario=no-schema] state.variants is empty');
      assert.strictEqual(output!.colorsLength,  2,             '[cell=5, scenario=no-schema] colors still parsed');
      assert.strictEqual(output!.jsonOk,        true,          '[cell=5, scenario=no-schema] emit:json succeeds');
    },
    'input': { 'colors': ['#ff6b6b', '#4ecdc4'], 'mode': 'no-schema' },
    'kind': 'edge',
    'name': 'no roles field — resolve and expand skip cleanly'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                     '[cell=5, scenario=all-empty] no throw');
      assert.strictEqual(output!.rolesEmpty,    true,          '[cell=5, scenario=all-empty] roles empty');
      assert.strictEqual(output!.variantsEmpty, true,          '[cell=5, scenario=all-empty] variants empty');
      assert.strictEqual(output!.colorsLength,  0,             '[cell=5, scenario=all-empty] no colors');
    },
    'input': { 'colors': [], 'mode': 'empty-list' },
    'kind': 'edge',
    'name': 'empty input colors with empty schema produces fully-empty state'
  }
];

new ScenarioRunner<EmptySchemaInput, {
  readonly 'colorsLength':  number;
  readonly 'jsonOk':        boolean;
  readonly 'rolesEmpty':    boolean;
  readonly 'variantsEmpty': boolean;
}>(
  'Pipeline.composition :: cell-5 :: empty-schema',
  (input) => {
    const engine = PipelineFixtures.freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'enforce:contrast', 'emit:json']);

    const runInput: InputInterface = input.mode === 'empty-list'
      ? { 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': { 'contrastPairs': undefined, 'description': undefined, 'name': 'empty-schema', 'roles': [] }, 'runtime': undefined }
      : { 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined };

    const state = engine.run(runInput);
    const json  = state.outputs['core:json'] as JsonOutput | undefined;

    return {
      'colorsLength':  state.colors.length,
      'jsonOk':        json !== undefined,
      'rolesEmpty':    Object.keys(state.roles).length    === 0,
      'variantsEmpty': Object.keys(state.variants).length === 0
    };
  }
).run(emptySchemaScenarios);
