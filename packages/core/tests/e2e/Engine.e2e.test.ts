/**
 * Engine.e2e — scenario-matrix suite.
 *
 * Subject: `Engine` end-to-end with real coreTasks.
 * Each cell covers one concern; scenarios exhaust the happy / edge / unhappy
 * matrix. Every Engine instance is fresh (no shared state between scenarios).
 *
 * Cells:
 *   1. intake-hex        — pipeline with intake:hex parses colors and populates state
 *   2. intake-any        — intake:any dispatcher routes every format to the correct delegate
 *   3. pipeline-order    — no pipeline() call runs all registered tasks in order
 *   4. clamp-count       — 64-color and bypass:true paths
 *   5. enforce-contrast  — no-op when pair already passes, task-throw propagation
 *   6. runtime           — input.runtime copied to state.runtime, defaults to {}
 *   7. error-paths       — nonexistent task name, task that throws, malformed colors
 */

import type {
  ColorRecordInterfaceType,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleSchemaInterfaceType,
  SourceFormatType,
  TaskInterface,
} from '@studnicky/iridis';
import type { ColorSpaceType, FramingType } from '@studnicky/iridis/types';
import { Engine }       from '@studnicky/iridis';
import { coreTasks }    from '@studnicky/iridis/tasks';
import { test }         from 'node:test';
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

const SIMPLE_ROLES: RoleSchemaInterfaceType = {
  'name': 'simple',
  'roles': [
    { 'name': 'primary',   'required': true,  'lightnessRange': [0.3, 0.7] },
    { 'name': 'secondary', 'required': false, 'lightnessRange': [0.4, 0.8] },
    { 'name': 'primary-muted', 'derivedFrom': 'primary', 'chromaRange': [0.01, 0.08] },
  ],
  'contrastPairs': [
    { 'foreground': 'primary', 'background': 'secondary', 'minRatio': 1.0 },
  ],
};

function makeColors(count: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const h = (i * 7) % 256;
    colors.push(`#${h.toString(16).padStart(2, '0')}${(255 - h).toString(16).padStart(2, '0')}80`);
  }
  return colors;
}

// ---------------------------------------------------------------------------
// Cell 1 — intake:hex parses colors and populates state
//
// intake:hex reads the raw input.colors array of hex strings and writes parsed
// ColorRecord objects into state.colors. The full pipeline then resolves roles,
// expands the family, enforces contrast, derives variants, and emits JSON.
// ---------------------------------------------------------------------------

interface IntakeHexInput {
  readonly colors: string[];
  readonly roles:  RoleSchemaInterfaceType;
}
interface IntakeHexOutput {
  readonly colorsLength: number;
  readonly rolesCount:   number;
  readonly hasDerivedRole: boolean;
  readonly hasDarkVariant: boolean;
  readonly hasLightVariant: boolean;
  readonly hasJsonOutput:  boolean;
}

const intakeHexScenarios: readonly ScenarioInterface<IntakeHexInput, IntakeHexOutput>[] = [
  {
    name: 'full pipeline with 3 hex seeds populates all state fields',
    kind: 'happy',
    input: { colors: ['#5b21b6', '#c4b5fd', '#1e1b4b'], roles: SIMPLE_ROLES },
    assert(output, error) {
      assert.strictEqual(error, undefined,                 '[cell=1, scenario=full-pipeline] no throw');
      assert.ok(output!.colorsLength >= 1,                 '[cell=1, scenario=full-pipeline] colors populated');
      assert.ok(output!.rolesCount   >= 1,                 '[cell=1, scenario=full-pipeline] roles assigned');
      assert.strictEqual(output!.hasDerivedRole,   true,  '[cell=1, scenario=full-pipeline] derived role present');
      assert.strictEqual(output!.hasDarkVariant,   true,  '[cell=1, scenario=full-pipeline] dark variant exists');
      assert.strictEqual(output!.hasLightVariant,  true,  '[cell=1, scenario=full-pipeline] light variant exists');
      assert.strictEqual(output!.hasJsonOutput,    true,  '[cell=1, scenario=full-pipeline] json output populated');
    },
  },
  {
    name: '1-color seed fills derived role via expand:family',
    kind: 'edge',
    input: { colors: ['#6366f1'], roles: SIMPLE_ROLES },
    assert(output, error) {
      assert.strictEqual(error, undefined,                '[cell=1, scenario=1-seed] no throw');
      assert.ok(output!.colorsLength >= 1,                '[cell=1, scenario=1-seed] colors populated');
      assert.strictEqual(output!.hasDerivedRole, true,   '[cell=1, scenario=1-seed] primary-muted derived via expand:family');
    },
  },
];

new ScenarioRunner<IntakeHexInput, IntakeHexOutput>(
  'Engine.e2e :: cell-1 :: intake-hex',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'enforce:contrast', 'derive:variant', 'emit:json']);
    const state = await engine.run({ 'colors': input.colors, 'roles': input.roles });
    const json = state.outputs['core:json'] as Record<string, unknown> | undefined;
    return {
      colorsLength:     state.colors.length,
      rolesCount:       Object.keys(state.roles).length,
      hasDerivedRole:   'primary-muted' in state.roles,
      hasDarkVariant:   'dark'  in state.variants,
      hasLightVariant:  'light' in state.variants,
      hasJsonOutput:    json !== undefined && Array.isArray((json as { colors: unknown[] }).colors),
    };
  },
).run(intakeHexScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — intake:any dispatcher routes every format correctly
//
// intake:any walks the input array through delegates in this order:
//   hex → rgb → hsl → oklch → lab → named → imagePixel
// Each format produces exactly one ColorRecord. Records carry the correct
// sourceFormat tag and a canonical 6-digit hex.
// ---------------------------------------------------------------------------

interface IntakeAnyInput  { readonly colors: unknown[] }
interface IntakeAnyOutput {
  readonly count:        number;
  readonly sourceFormats: readonly string[];
  readonly hexValues:    readonly string[];
}

const intakeAnyScenarios: readonly ScenarioInterface<IntakeAnyInput, IntakeAnyOutput>[] = [
  {
    name: 'two hex strings dispatched to hex delegate',
    kind: 'happy',
    input: { colors: ['#ff6b6b', '#4ecdc4'] },
    assert(output, error) {
      assert.strictEqual(error,        undefined,                '[cell=2, scenario=hex-dispatch] no throw');
      assert.strictEqual(output!.count, 2,                       '[cell=2, scenario=hex-dispatch] both hex strings parsed');
      assert.ok(output!.sourceFormats.every((f) => f === 'hex'), '[cell=2, scenario=hex-dispatch] both tagged hex');
    },
  },
  {
    name: 'six mixed-format inputs each route to their delegate',
    kind: 'happy',
    input: {
      colors: [
        '#fff',                              // intake:hex
        { 'r': 1,   'g': 0,   'b': 0 },      // intake:rgb (0..1 floats)
        { 'h': 200, 's': 0.5, 'l': 0.4 },    // intake:hsl
        { 'l': 0.6, 'c': 0.2, 'h': 250 },    // intake:oklch
        { 'l': 0.6, 'a': 0.1, 'b': -0.1 },   // intake:lab
        'rebeccapurple',                     // intake:named
      ],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,                                             '[cell=2, scenario=mixed] no throw');
      assert.strictEqual(output!.count, 6,                                             '[cell=2, scenario=mixed] six records produced');
      const expected: readonly SourceFormatType[] = ['hex', 'rgb', 'hsl', 'oklch', 'lab', 'named'];
      for (let i = 0; i < expected.length; i++) {
        assert.strictEqual(
          output!.sourceFormats[i], expected[i],
          `[cell=2, scenario=mixed] record ${i} sourceFormat should be "${expected[i]}", got "${output!.sourceFormats[i]}"`,
        );
      }
      assert.strictEqual(output!.hexValues[0], '#ffffff',  '[cell=2, scenario=mixed] "#fff" canonicalised to "#ffffff"');
      assert.strictEqual(output!.hexValues[1], '#ff0000',  '[cell=2, scenario=mixed] {r:1,g:0,b:0} round-trips to "#ff0000"');
      assert.strictEqual(output!.hexValues[5], '#663399',  '[cell=2, scenario=mixed] "rebeccapurple" resolves to "#663399"');
    },
  },
  {
    name: 'short 3-digit hex "#fff" canonicalises to 6-digit "#ffffff"',
    kind: 'edge',
    input: { colors: ['#fff'] },
    assert(output, error) {
      assert.strictEqual(error,           undefined,    '[cell=2, scenario=short-hex] no throw');
      assert.strictEqual(output!.count,   1,            '[cell=2, scenario=short-hex] one record');
      assert.strictEqual(output!.hexValues[0], '#ffffff', '[cell=2, scenario=short-hex] expanded to 6-digit');
    },
  },
  {
    name: 'empty input array produces zero records',
    kind: 'edge',
    input: { colors: [] },
    assert(output, error) {
      assert.strictEqual(error,         undefined, '[cell=2, scenario=empty] no throw');
      assert.strictEqual(output!.count, 0,         '[cell=2, scenario=empty] zero records');
    },
  },
];

new ScenarioRunner<IntakeAnyInput, IntakeAnyOutput>(
  'Engine.e2e :: cell-2 :: intake-any',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:any']);
    const state = await engine.run({ 'colors': input.colors as InputInterface['colors'] });
    return {
      count:         state.colors.length,
      sourceFormats: state.colors.map((c) => (c as ColorRecordInterfaceType).sourceFormat),
      hexValues:     state.colors.map((c) => (c as ColorRecordInterfaceType).hex),
    };
  },
).run(intakeAnyScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — no pipeline() call runs all registered tasks in registration order
//
// When pipeline() is never called the engine must fall back to executing every
// registered task in the order they were registered. This allows ad-hoc
// sequencing without explicit pipeline declaration.
// ---------------------------------------------------------------------------

interface NoPipelineInput  { readonly taskNames: readonly string[] }
interface NoPipelineOutput { readonly executionOrder: readonly string[] }

const noPipelineScenarios: readonly ScenarioInterface<NoPipelineInput, NoPipelineOutput>[] = [
  {
    name: 'two stub tasks run in registration order',
    kind: 'happy',
    input: { taskNames: ['stub:a', 'stub:b'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=two-tasks] no throw');
      assert.deepStrictEqual(output!.executionOrder, ['stub:a', 'stub:b'], '[cell=3, scenario=two-tasks] registration order honored');
    },
  },
  {
    name: 'no registered tasks — runs cleanly with empty execution log',
    kind: 'edge',
    input: { taskNames: [] },
    assert(output, error) {
      assert.strictEqual(error, undefined,                    '[cell=3, scenario=no-tasks] no throw');
      assert.deepStrictEqual(output!.executionOrder, [],     '[cell=3, scenario=no-tasks] nothing executed');
    },
  },
];

new ScenarioRunner<NoPipelineInput, NoPipelineOutput>(
  'Engine.e2e :: cell-3 :: pipeline-order',
  async (input) => {
    const engine = new Engine();
    const ran: string[] = [];
    for (const name of input.taskNames) {
      const taskName = name;
      const task: TaskInterface = {
        'name': taskName,
        'manifest': { 'name': taskName },
        run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void { ran.push(taskName); },
      };
      engine.tasks.register(task);
    }
    // No engine.pipeline() call
    await engine.run({ 'colors': [] });
    return { executionOrder: ran };
  },
).run(noPipelineScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — clamp:count and bypass:true
//
// clamp:count must reduce a large input to ≤ maxColors. bypass:true must
// leave all colors intact regardless of maxColors.
// ---------------------------------------------------------------------------

interface ClampInput  { readonly count: number; readonly bypass?: boolean; readonly maxColors?: number }
interface ClampOutput { readonly resultLength: number }

const clampScenarios: readonly ScenarioInterface<ClampInput, ClampOutput>[] = [
  {
    name: '100 colors clamped to ≤64 when maxColors=64',
    kind: 'happy',
    input: { count: 100, maxColors: 64 },
    assert(output, error) {
      assert.strictEqual(error, undefined,                      '[cell=4, scenario=clamp-64] no throw');
      assert.ok(
        output!.resultLength <= 64,
        `[cell=4, scenario=clamp-64] colors ≤ 64, got ${output!.resultLength}`,
      );
    },
  },
  {
    name: 'bypass:true leaves all 100 colors intact',
    kind: 'edge',
    input: { count: 100, bypass: true },
    assert(output, error) {
      assert.strictEqual(error,             undefined, '[cell=4, scenario=bypass] no throw');
      assert.strictEqual(output!.resultLength, 100,    '[cell=4, scenario=bypass] bypass:true preserves all colors');
    },
  },
  {
    name: 'maxColors=1 clamps extreme input to single color',
    kind: 'edge',
    input: { count: 64, maxColors: 1 },
    assert(output, error) {
      assert.strictEqual(error, undefined,                    '[cell=4, scenario=clamp-1] no throw');
      assert.ok(
        output!.resultLength <= 1,
        `[cell=4, scenario=clamp-1] colors ≤ 1, got ${output!.resultLength}`,
      );
    },
  },
];

new ScenarioRunner<ClampInput, ClampOutput>(
  'Engine.e2e :: cell-4 :: clamp-count',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'clamp:count']);
    const runInput: InputInterface = {
      'colors':    makeColors(input.count),
      ...(input.bypass    !== undefined ? { 'bypass':    input.bypass    } : {}),
      ...(input.maxColors !== undefined ? { 'maxColors': input.maxColors } : {}),
    };
    const state = await engine.run(runInput);
    return { resultLength: state.colors.length };
  },
).run(clampScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — enforce:contrast is a no-op when pair already passes
//
// When the supplied color pair already satisfies the minRatio the task must
// leave state unchanged (contrastReport.adjusted === false or report absent).
// ---------------------------------------------------------------------------

interface EnforceContrastInput  {
  readonly fgHex: string;
  readonly bgHex: string;
  readonly minRatio: number;
}
interface EnforceContrastOutput {
  readonly statePresent: boolean;
}

const enforceContrastScenarios: readonly ScenarioInterface<EnforceContrastInput, EnforceContrastOutput>[] = [
  {
    name: 'black-on-white (contrast ≈21) is no-op for minRatio=3',
    kind: 'happy',
    input: { fgHex: '#000000', bgHex: '#ffffff', minRatio: 3.0 },
    assert(output, error) {
      assert.strictEqual(error,               undefined, '[cell=5, scenario=no-op] no throw');
      assert.strictEqual(output!.statePresent, true,     '[cell=5, scenario=no-op] engine returned state');
    },
  },
  {
    name: 'engine completes when roles unresolvable from object inputs',
    kind: 'edge',
    input: { fgHex: '#000000', bgHex: '#ffffff', minRatio: 3.0 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=unresolvable-roles] no throw on unreachable contrast check');
      assert.strictEqual(output!.statePresent, true, '[cell=5, scenario=unresolvable-roles] state returned');
    },
  },
];

const highContrastRoles: RoleSchemaInterfaceType = {
  'name': 'hi-contrast',
  'roles': [
    { 'name': 'text',       'required': true },
    { 'name': 'background', 'required': true },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 3.0 },
  ],
};

new ScenarioRunner<EnforceContrastInput, EnforceContrastOutput>(
  'Engine.e2e :: cell-5 :: enforce-contrast',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles', 'enforce:contrast']);
    const state = await engine.run({
      'colors': [input.fgHex, input.bgHex],
      'roles':  highContrastRoles,
    });
    return { statePresent: state !== undefined };
  },
).run(enforceContrastScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — input.runtime flows to state.runtime
//
// state.runtime must be a copy of input.runtime (not the same reference).
// When input.runtime is omitted, state.runtime defaults to {}.
// Tasks can read framing from state.runtime.
// ---------------------------------------------------------------------------

interface RuntimeInput {
  readonly runtime?: { framing?: FramingType; colorSpace?: ColorSpaceType };
}
interface RuntimeOutput {
  readonly framing:           string | undefined;
  readonly colorSpace:        string | undefined;
  readonly isDefaultEmpty:    boolean;
  readonly isSameRef:         boolean;
}

const runtimeScenarios: readonly ScenarioInterface<RuntimeInput, RuntimeOutput>[] = [
  {
    name: 'input.runtime fields are copied to state.runtime',
    kind: 'happy',
    input: { runtime: { 'framing': 'dark', 'colorSpace': 'displayP3' } },
    assert(output, error) {
      assert.strictEqual(error,              undefined,     '[cell=6, scenario=copy] no throw');
      assert.strictEqual(output!.framing,    'dark',        '[cell=6, scenario=copy] framing copied');
      assert.strictEqual(output!.colorSpace, 'displayP3',   '[cell=6, scenario=copy] colorSpace copied');
      assert.strictEqual(output!.isSameRef,  false,         '[cell=6, scenario=copy] state.runtime is a fresh object');
    },
  },
  {
    name: 'omitted input.runtime defaults state.runtime to empty object',
    kind: 'edge',
    input: {},
    assert(output, error) {
      assert.strictEqual(error,                 undefined, '[cell=6, scenario=default] no throw');
      assert.strictEqual(output!.isDefaultEmpty, true,     '[cell=6, scenario=default] state.runtime defaults to {}');
    },
  },
];

new ScenarioRunner<RuntimeInput, RuntimeOutput>(
  'Engine.e2e :: cell-6 :: runtime',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:hex']);
    const runInput: InputInterface = {
      'colors':  ['#ff0000'],
      ...(input.runtime !== undefined ? { 'runtime': input.runtime } : {}),
    };
    const state = await engine.run(runInput);
    return {
      framing:        state.runtime.framing,
      colorSpace:     state.runtime.colorSpace,
      isDefaultEmpty: Object.keys(state.runtime).length === 0,
      isSameRef:      state.runtime === (runInput.runtime as unknown),
    };
  },
).run(runtimeScenarios);

// ---------------------------------------------------------------------------
// Cell 7 — error paths
//
// nonexistent task name in pipeline() throws synchronously.
// A task that throws propagates the error to the caller of run().
// Malformed (non-hex-string) colors are silently skipped by intake:hex.
// ---------------------------------------------------------------------------

interface ErrorInput {
  readonly scenario: 'unknown-task' | 'task-throws' | 'malformed-colors';
}
interface ErrorOutput {
  readonly colorsLength:  number;
  readonly hasJsonOutput: boolean;
}

const errorScenarios: readonly ScenarioInterface<ErrorInput, ErrorOutput>[] = [
  {
    name: 'pipeline with nonexistent task name throws with task name in message',
    kind: 'unhappy',
    input: { scenario: 'unknown-task' },
    assert(_output, error) {
      assert.ok(error instanceof Error,                             '[cell=7, scenario=unknown-task] expected throw');
      assert.ok(
        (error as Error).message.includes('nonexistent:task'),
        `[cell=7, scenario=unknown-task] error mentions task name, got: ${(error as Error).message}`,
      );
    },
  },
  {
    name: 'task that throws propagates error to run() caller',
    kind: 'unhappy',
    input: { scenario: 'task-throws' },
    assert(_output, error) {
      assert.ok(error instanceof Error,                                              '[cell=7, scenario=task-throws] expected throw');
      assert.ok(
        (error as Error).message.includes('intentional bomb detonation'),
        `[cell=7, scenario=task-throws] error message propagated, got: ${(error as Error).message}`,
      );
    },
  },
  {
    name: 'non-hex input to intake:hex throws with a descriptive error',
    kind: 'unhappy',
    input: { scenario: 'malformed-colors' },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=malformed] intake:hex must throw on non-hex input');
      assert.match((error as Error).message, /intake:hex/,
        '[cell=7, scenario=malformed] error names the offending intake task');
    },
  },
];

new ScenarioRunner<ErrorInput, ErrorOutput>(
  'Engine.e2e :: cell-7 :: error-paths',
  async (input) => {
    if (input.scenario === 'unknown-task') {
      const engine = freshEngine();
      engine.pipeline(['intake:hex', 'nonexistent:task']);
      // Should throw during pipeline(); run() is never reached
      return { colorsLength: 0, hasJsonOutput: false };
    }

    if (input.scenario === 'task-throws') {
      const engine = new Engine();
      const bomb: TaskInterface = {
        'name': 'bomb:task',
        'manifest': { 'name': 'bomb:task' },
        run(): void { throw new Error('intentional bomb detonation'); },
      };
      engine.tasks.register(bomb);
      engine.pipeline(['bomb:task']);
      await engine.run({ 'colors': ['#ff0000'] });
      return { colorsLength: 0, hasJsonOutput: false };
    }

    // malformed-colors
    const engine = freshEngine();
    engine.pipeline(['intake:hex', 'clamp:count', 'emit:json']);
    const state = await engine.run({
      'colors': [{} as unknown, null as unknown, 42 as unknown],
    });
    const json = state.outputs['core:json'] as { colors: string[] } | undefined;
    return {
      colorsLength:  state.colors.length,
      hasJsonOutput: json !== undefined,
    };
  },
).run(errorScenarios);

// ---------------------------------------------------------------------------
// Cell 8 — tasks observe state.runtime.framing (behavioural invariant)
//
// A task that reads framing from state.runtime must observe the value passed
// in from input.runtime. This is a single-shot invariant; bare test at bottom.
// ---------------------------------------------------------------------------

test('Engine.e2e :: cell-8 :: runtime-task-observation :: tasks read framing from state.runtime', async () => {
  const engine = freshEngine();
  let observedFraming: string | undefined;

  const observer: TaskInterface = {
    'name': 'observe:framing',
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      observedFraming = state.runtime.framing;
    },
  };
  engine.tasks.register(observer);
  engine.pipeline(['observe:framing']);

  await engine.run({ 'colors': [], 'runtime': { 'framing': 'light' } });

  assert.strictEqual(
    observedFraming,
    'light',
    '[cell=8, scenario=framing-observed] task should see framing="light" from input.runtime',
  );
});
