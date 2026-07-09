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
  InputInterface,
  PaletteStateInterface,
  RoleSchemaInterfaceType,
  TaskInterface,
} from '@studnicky/iridis';
import { Engine }    from '@studnicky/iridis';
import { coreTasks } from '@studnicky/iridis/tasks';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) { engine.tasks.register(t); }
  return engine;
}

type JsonOutput = {
  'colors':   string[];
  'roles':    Record<string, string>;
  'variants': Record<string, Record<string, string>>;
};

function makeHintedRecord(
  l: number, c: number, h: number,
  r: number, g: number, b: number,
  hex: string,
  role: string,
): ColorRecordInterfaceType {
  return {
    'oklch':        { l, c, h },
    'rgb':          { r, g, b },
    hex,
    'alpha':        1,
    'sourceFormat': 'hex',
    'displayP3':    undefined,
    'hints':        { 'role': role },
  };
}

// ---------------------------------------------------------------------------
// Cell 1 — role assignment: distance-based and hint-driven
//
// When hex strings (no hints) are supplied, resolve:roles assigns roles via
// OKLCH distance matching. When a color carries hints.role the matching is
// exact — the role receives the exact same object reference (no clone).
// ---------------------------------------------------------------------------

interface RoleAssignmentInput {
  readonly mode: 'distance' | 'hint';
}
interface RoleAssignmentOutput {
  readonly hasAccent:   boolean;
  readonly hasSurface:  boolean;
  readonly hasText:     boolean;
  readonly accentIsRef: boolean;   // only meaningful in hint mode
  readonly surfaceIsRef: boolean;  // only meaningful in hint mode
}

const hintedAccent  = makeHintedRecord(0.6, 0.15, 250, 0.3, 0.2, 0.8, '#4d33cc', 'accent');
const hintedSurface = makeHintedRecord(0.95, 0.01, 0, 0.95, 0.95, 0.95, '#f2f2f2', 'surface');

const hintSchema: RoleSchemaInterfaceType = {
  'name': 'hint-schema',
  'roles': [
    { 'name': 'accent',  'required': true },
    { 'name': 'surface', 'required': true },
  ],
};

const distanceSchema: RoleSchemaInterfaceType = {
  'name': 'hint-test',
  'roles': [
    { 'name': 'accent',  'required': true },
    { 'name': 'surface', 'required': true },
    { 'name': 'text',    'required': false },
  ],
};

const roleAssignmentScenarios: readonly ScenarioInterface<RoleAssignmentInput, RoleAssignmentOutput>[] = [
  {
    name: 'hex-string input resolves all three roles via distance matching',
    kind: 'happy',
    input: { mode: 'distance' },
    assert(output, error) {
      assert.strictEqual(error, undefined,           '[cell=1, scenario=distance] no throw');
      assert.strictEqual(output!.hasAccent,   true,  '[cell=1, scenario=distance] accent assigned');
      assert.strictEqual(output!.hasSurface,  true,  '[cell=1, scenario=distance] surface assigned');
      assert.strictEqual(output!.hasText,     true,  '[cell=1, scenario=distance] text assigned');
    },
  },
  {
    name: 'hint.role causes exact (reference-equal) role assignment',
    kind: 'happy',
    input: { mode: 'hint' },
    assert(output, error) {
      assert.strictEqual(error, undefined,            '[cell=1, scenario=hint] no throw');
      assert.strictEqual(output!.hasAccent,   true,   '[cell=1, scenario=hint] accent assigned');
      assert.strictEqual(output!.hasSurface,  true,   '[cell=1, scenario=hint] surface assigned');
      assert.strictEqual(output!.accentIsRef,  true,  '[cell=1, scenario=hint] accent is exact hinted reference');
      assert.strictEqual(output!.surfaceIsRef, true,  '[cell=1, scenario=hint] surface is exact hinted reference');
    },
  },
];

new ScenarioRunner<RoleAssignmentInput, RoleAssignmentOutput>(
  'Pipeline.composition :: cell-1 :: role-assignment',
  async (input) => {
    if (input.mode === 'distance') {
      const engine = freshEngine();
      engine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'emit:json']);
      // Three colors with distinct lightness so each role resolves via distance
      const state = await engine.run({
        'colors': ['#6d28d9', '#f5f3ff', '#1c1917'],
        'roles':  distanceSchema,
      });
      return {
        hasAccent:   'accent'  in state.roles,
        hasSurface:  'surface' in state.roles,
        hasText:     'text'    in state.roles,
        accentIsRef:  false,
        surfaceIsRef: false,
      };
    }

    // hint mode: seed state directly via onRunStart hook
    const engine = freshEngine();
    engine.tasks.hook('onRunStart', {
      'name': 'seed:hinted',
      'manifest': { 'name': 'seed:hinted', 'phase': 'onRunStart' },
      run(state: PaletteStateInterface): void {
        state.colors.push(hintedAccent, hintedSurface);
      },
    } as TaskInterface);
    engine.pipeline(['resolve:roles', 'expand:family', 'emit:json']);

    const state = await engine.run({ 'colors': [], 'roles': hintSchema });
    return {
      hasAccent:    'accent'  in state.roles,
      hasSurface:   'surface' in state.roles,
      hasText:      false,
      accentIsRef:  state.roles['accent']  === hintedAccent,
      surfaceIsRef: state.roles['surface'] === hintedSurface,
    };
  },
).run(roleAssignmentScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — derive:variant produces dark and light maps over all roles
//
// state.variants must have keys 'dark' and 'light'. Each variant must contain
// exactly as many entries as state.roles. Dark L should approximate (1 - primary L).
// emit:json must capture the variants in its output.
// ---------------------------------------------------------------------------

const variantSchema: RoleSchemaInterfaceType = {
  'name':  'variant-test',
  'roles': [
    { 'name': 'primary', 'required': true },
    { 'name': 'muted',   'required': true },
  ],
};

interface VariantInput  { readonly colors: string[] }
interface VariantOutput {
  readonly hasDark:        boolean;
  readonly hasLight:       boolean;
  readonly darkRoleCount:  number;
  readonly lightRoleCount: number;
  readonly stateRoleCount: number;
  readonly primaryL:       number;
  readonly darkPrimaryL:   number;
  readonly jsonHasDark:    boolean;
  readonly jsonHasLight:   boolean;
}

const variantScenarios: readonly ScenarioInterface<VariantInput, VariantOutput>[] = [
  {
    name: 'two seeds produce dark and light variants with matching role counts',
    kind: 'happy',
    input: { colors: ['#6366f1', '#a5b4fc'] },
    assert(output, error) {
      assert.strictEqual(error, undefined,                             '[cell=2, scenario=two-seeds] no throw');
      assert.strictEqual(output!.hasDark,  true,                      '[cell=2, scenario=two-seeds] variants.dark exists');
      assert.strictEqual(output!.hasLight, true,                      '[cell=2, scenario=two-seeds] variants.light exists');
      assert.strictEqual(
        output!.darkRoleCount, output!.stateRoleCount,
        '[cell=2, scenario=two-seeds] dark variant count matches role count',
      );
      assert.strictEqual(
        output!.lightRoleCount, output!.stateRoleCount,
        '[cell=2, scenario=two-seeds] light variant count matches role count',
      );
      const eps = 0.05;
      assert.ok(
        Math.abs(output!.darkPrimaryL - (1 - output!.primaryL)) < eps,
        `[cell=2, scenario=two-seeds] dark.primary.L ≈ 1 - primary.L; got ${output!.darkPrimaryL}`,
      );
      assert.strictEqual(output!.jsonHasDark,  true, '[cell=2, scenario=two-seeds] json.variants.dark present');
      assert.strictEqual(output!.jsonHasLight, true, '[cell=2, scenario=two-seeds] json.variants.light present');
    },
  },
];

new ScenarioRunner<VariantInput, VariantOutput>(
  'Pipeline.composition :: cell-2 :: derive-variant',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles', 'derive:variant', 'emit:json']);
    const state = await engine.run({ 'colors': input.colors, 'roles': variantSchema });
    const dark  = state.variants['dark']  as Record<string, ColorRecordInterfaceType> | undefined;
    const light = state.variants['light'] as Record<string, ColorRecordInterfaceType> | undefined;
    const json  = state.outputs['core:json']   as JsonOutput | undefined;
    return {
      hasDark:        'dark'  in state.variants,
      hasLight:       'light' in state.variants,
      darkRoleCount:  Object.keys(dark  ?? {}).length,
      lightRoleCount: Object.keys(light ?? {}).length,
      stateRoleCount: Object.keys(state.roles).length,
      primaryL:       state.roles['primary']?.oklch.l ?? 0,
      darkPrimaryL:   dark?.['primary']?.oklch.l ?? -1,
      jsonHasDark:    json !== undefined && 'dark'  in json.variants,
      jsonHasLight:   json !== undefined && 'light' in json.variants,
    };
  },
).run(variantScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — contrastReport shape and content
//
// enforce:contrast must write a contrastReport array into state.metadata.
// Each entry must have foreground, background, ratio, minRatio, passed, adjusted.
// ---------------------------------------------------------------------------

const contrastReportSchema: RoleSchemaInterfaceType = {
  'name': 'contrast-report-test',
  'roles': [
    { 'name': 'text',    'required': true },
    { 'name': 'surface', 'required': true },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'surface', 'minRatio': 3.0 },
  ],
};

type ContrastReportEntry = {
  'foreground': string;
  'background': string;
  'ratio':      number;
  'minRatio':   number;
  'passed':     boolean;
  'adjusted':   boolean;
};

interface ContrastReportInput  { readonly fgHex: string; readonly bgHex: string }
interface ContrastReportOutput {
  readonly reportLength:   number;
  readonly foreground:     string;
  readonly background:     string;
  readonly ratioIsNumber:  boolean;
  readonly minRatioIsNum:  boolean;
  readonly passedIsBool:   boolean;
  readonly adjustedIsBool: boolean;
}

const contrastReportScenarios: readonly ScenarioInterface<ContrastReportInput, ContrastReportOutput>[] = [
  {
    name: 'high-contrast pair produces one-entry report with correct field types',
    kind: 'happy',
    input: { fgHex: '#1a1a2e', bgHex: '#eeeeff' },
    assert(output, error) {
      assert.strictEqual(error, undefined,                           '[cell=3, scenario=report-shape] no throw');
      assert.strictEqual(output!.reportLength,   1,                  '[cell=3, scenario=report-shape] one entry for one pair');
      assert.strictEqual(output!.foreground,  'text',                '[cell=3, scenario=report-shape] foreground is "text"');
      assert.strictEqual(output!.background,  'surface',             '[cell=3, scenario=report-shape] background is "surface"');
      assert.strictEqual(output!.ratioIsNumber,   true,              '[cell=3, scenario=report-shape] ratio is a number');
      assert.strictEqual(output!.minRatioIsNum,   true,              '[cell=3, scenario=report-shape] minRatio is a number');
      assert.strictEqual(output!.passedIsBool,    true,              '[cell=3, scenario=report-shape] passed is boolean');
      assert.strictEqual(output!.adjustedIsBool,  true,              '[cell=3, scenario=report-shape] adjusted is boolean');
    },
  },
];

new ScenarioRunner<ContrastReportInput, ContrastReportOutput>(
  'Pipeline.composition :: cell-3 :: contrast-report',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles', 'enforce:contrast']);
    const state = await engine.run({
      'colors': [input.fgHex, input.bgHex],
      'roles':  contrastReportSchema,
    });
    const report = state.metadata['core:contrastReport'] as ContrastReportEntry[] | undefined;
    const entry  = Array.isArray(report) ? report[0] : undefined;
    return {
      reportLength:   Array.isArray(report) ? report.length : 0,
      foreground:     entry?.foreground     ?? '',
      background:     entry?.background     ?? '',
      ratioIsNumber:  typeof entry?.ratio    === 'number',
      minRatioIsNum:  typeof entry?.minRatio === 'number',
      passedIsBool:   typeof entry?.passed   === 'boolean',
      adjustedIsBool: typeof entry?.adjusted === 'boolean',
    };
  },
).run(contrastReportScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — double enforce:contrast is idempotent
//
// Running enforce:contrast twice must leave the final report's adjusted field
// as false: the second run sees a pair that already passes and must not
// re-adjust it.
// ---------------------------------------------------------------------------

const idempotentSchema: RoleSchemaInterfaceType = {
  'name': 'idempotent-test',
  'roles': [
    { 'name': 'text',      'required': true },
    { 'name': 'surface',   'required': true },
    { 'name': 'text-muted', 'derivedFrom': 'text', 'chromaRange': [0.01, 0.05] },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'surface', 'minRatio': 4.5 },
  ],
};

interface IdempotentInput  { readonly fgHex: string; readonly bgHex: string }
interface IdempotentOutput { readonly lastEntryAdjusted: boolean; readonly reportIsArray: boolean }

const idempotentScenarios: readonly ScenarioInterface<IdempotentInput, IdempotentOutput>[] = [
  {
    name: 'second enforce:contrast does not adjust an already-passing pair',
    kind: 'happy',
    input: { fgHex: '#111111', bgHex: '#f0f0f0' },
    assert(output, error) {
      assert.strictEqual(error, undefined,                              '[cell=4, scenario=idempotent] no throw');
      assert.strictEqual(output!.reportIsArray,        true,           '[cell=4, scenario=idempotent] contrastReport is array');
      assert.strictEqual(output!.lastEntryAdjusted,    false,          '[cell=4, scenario=idempotent] second enforce is no-op');
    },
  },
];

new ScenarioRunner<IdempotentInput, IdempotentOutput>(
  'Pipeline.composition :: cell-4 :: idempotency',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline([
      'intake:hex', 'resolve:roles', 'enforce:contrast',
      'expand:family', 'enforce:contrast', 'emit:json',
    ]);
    const state  = await engine.run({ 'colors': [input.fgHex, input.bgHex], 'roles': idempotentSchema });
    const report = state.metadata['core:contrastReport'] as ContrastReportEntry[] | undefined;
    const last   = Array.isArray(report) && report.length > 0 ? report[report.length - 1] : undefined;
    return {
      reportIsArray:     Array.isArray(report),
      lastEntryAdjusted: last?.adjusted ?? false,
    };
  },
).run(idempotentScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — empty or absent role schema
//
// An empty roles list (schema present but roles=[]) must produce empty
// state.roles and state.variants. An absent roles field must also return
// cleanly. In both cases emit:json still writes and colors are parsed normally.
// ---------------------------------------------------------------------------

interface EmptySchemaInput {
  readonly mode: 'empty-list' | 'no-schema';
  readonly colors: string[];
}
interface EmptySchemaOutput {
  readonly rolesEmpty:    boolean;
  readonly variantsEmpty: boolean;
  readonly colorsLength:  number;
  readonly jsonOk:        boolean;
}

const emptySchemaScenarios: readonly ScenarioInterface<EmptySchemaInput, EmptySchemaOutput>[] = [
  {
    name: 'empty roles list produces empty state.roles and state.variants',
    kind: 'edge',
    input: { mode: 'empty-list', colors: ['#ff0000', '#00ff00'] },
    assert(output, error) {
      assert.strictEqual(error, undefined,                     '[cell=5, scenario=empty-list] no throw');
      assert.strictEqual(output!.rolesEmpty,    true,          '[cell=5, scenario=empty-list] state.roles is empty');
      assert.strictEqual(output!.variantsEmpty, true,          '[cell=5, scenario=empty-list] state.variants is empty');
      assert.strictEqual(output!.colorsLength,  2,             '[cell=5, scenario=empty-list] colors still parsed');
      assert.strictEqual(output!.jsonOk,        true,          '[cell=5, scenario=empty-list] emit:json succeeds');
    },
  },
  {
    name: 'no roles field — resolve and expand skip cleanly',
    kind: 'edge',
    input: { mode: 'no-schema', colors: ['#ff6b6b', '#4ecdc4'] },
    assert(output, error) {
      assert.strictEqual(error, undefined,                     '[cell=5, scenario=no-schema] no throw');
      assert.strictEqual(output!.rolesEmpty,    true,          '[cell=5, scenario=no-schema] state.roles is empty');
      assert.strictEqual(output!.variantsEmpty, true,          '[cell=5, scenario=no-schema] state.variants is empty');
      assert.strictEqual(output!.colorsLength,  2,             '[cell=5, scenario=no-schema] colors still parsed');
      assert.strictEqual(output!.jsonOk,        true,          '[cell=5, scenario=no-schema] emit:json succeeds');
    },
  },
  {
    name: 'empty input colors with empty schema produces fully-empty state',
    kind: 'edge',
    input: { mode: 'empty-list', colors: [] },
    assert(output, error) {
      assert.strictEqual(error, undefined,                     '[cell=5, scenario=all-empty] no throw');
      assert.strictEqual(output!.rolesEmpty,    true,          '[cell=5, scenario=all-empty] roles empty');
      assert.strictEqual(output!.variantsEmpty, true,          '[cell=5, scenario=all-empty] variants empty');
      assert.strictEqual(output!.colorsLength,  0,             '[cell=5, scenario=all-empty] no colors');
    },
  },
];

new ScenarioRunner<EmptySchemaInput, EmptySchemaOutput>(
  'Pipeline.composition :: cell-5 :: empty-schema',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'enforce:contrast', 'emit:json']);

    const runInput: InputInterface = input.mode === 'empty-list'
      ? { 'colors': input.colors, 'roles': { 'name': 'empty-schema', 'roles': [] } }
      : { 'colors': input.colors };

    const state = await engine.run(runInput);
    const json  = state.outputs['core:json'] as JsonOutput | undefined;

    return {
      rolesEmpty:    Object.keys(state.roles).length    === 0,
      variantsEmpty: Object.keys(state.variants).length === 0,
      colorsLength:  state.colors.length,
      jsonOk:        json !== undefined,
    };
  },
).run(emptySchemaScenarios);
