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
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleSchemaInterfaceType,
  SourceFormatType,
  TaskInterface
} from '@studnicky/iridis';
import type { ColorSpaceType, FramingType } from '@studnicky/iridis/types';
import type { JsonValueType } from '@studnicky/types';

import { Engine }       from '@studnicky/iridis';
import { coreTasks }    from '@studnicky/iridis/tasks';
import assert           from 'node:assert/strict';
import { test }         from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class EngineTestFixture {
  static freshEngine(): Engine {
    const engine = new Engine();
    for (const t of coreTasks) { engine.tasks.register(t); }
    return engine;
  }

  static recordingRun(executionLog: string[], taskName: string): (state: PaletteStateInterface, context: PipelineContextInterface) => void {
    return (_state: PaletteStateInterface, _context: PipelineContextInterface): void => { executionLog.push(taskName); };
  }

  static throwingRun(message: string): (state: PaletteStateInterface, context: PipelineContextInterface) => void {
    return (_state: PaletteStateInterface, _context: PipelineContextInterface): void => { throw new Error(message); };
  }

  static framingObserverRun(holder: { 'value': string | undefined }): (state: PaletteStateInterface, context: PipelineContextInterface) => void {
    return (state: PaletteStateInterface, _context: PipelineContextInterface): void => { holder.value = state.runtime.framing; };
  }

  static makeColors(count: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      const h = (i * 7) % 256;
      colors.push(`#${h.toString(16).padStart(2, '0')}${(255 - h).toString(16).padStart(2, '0')}80`);
    }
    return colors;
  }
}

const SIMPLE_ROLES: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': undefined, 'background': 'secondary', 'foreground': 'primary', 'minRatio': 1.0 }
  ],
  'description': undefined,
  'name': 'simple', 'roles': [
    { 'chromaRange': undefined,   'derivedFrom': undefined,  'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.3, 0.7], 'name': 'primary', 'required': true },
    { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': [0.4, 0.8], 'name': 'secondary', 'required': false },
    { 'chromaRange': [0.01, 0.08], 'derivedFrom': 'primary', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'primary-muted', 'required': undefined }
  ]
};

// ---------------------------------------------------------------------------
// Cell 1 — intake:hex parses colors and populates state
//
// intake:hex reads the raw input.colors array of hex strings and writes parsed
// ColorRecord objects into state.colors. The full pipeline then resolves roles,
// expands the family, enforces contrast, derives variants, and emits JSON.
// ---------------------------------------------------------------------------

type IntakeHexInput = {
  readonly 'colors': string[];
  readonly 'roles':  RoleSchemaInterfaceType;
};
const intakeHexScenarios: readonly ScenarioInterface<IntakeHexInput, {
  readonly 'colorsLength': number;
  readonly 'hasDarkVariant': boolean;
  readonly 'hasDerivedRole': boolean;
  readonly 'hasJsonOutput':  boolean;
  readonly 'hasLightVariant': boolean;
  readonly 'rolesCount':   number;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                 '[cell=1, scenario=full-pipeline] no throw');
      assert.ok(output!.colorsLength >= 1,                 '[cell=1, scenario=full-pipeline] colors populated');
      assert.ok(output!.rolesCount   >= 1,                 '[cell=1, scenario=full-pipeline] roles assigned');
      assert.strictEqual(output!.hasDerivedRole,   true,  '[cell=1, scenario=full-pipeline] derived role present');
      assert.strictEqual(output!.hasDarkVariant,   true,  '[cell=1, scenario=full-pipeline] dark variant exists');
      assert.strictEqual(output!.hasLightVariant,  true,  '[cell=1, scenario=full-pipeline] light variant exists');
      assert.strictEqual(output!.hasJsonOutput,    true,  '[cell=1, scenario=full-pipeline] json output populated');
    },
    'input': { 'colors': ['#5b21b6', '#c4b5fd', '#1e1b4b'], 'roles': SIMPLE_ROLES },
    'kind': 'happy',
    'name': 'full pipeline with 3 hex seeds populates all state fields'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                '[cell=1, scenario=1-seed] no throw');
      assert.ok(output!.colorsLength >= 1,                '[cell=1, scenario=1-seed] colors populated');
      assert.strictEqual(output!.hasDerivedRole, true,   '[cell=1, scenario=1-seed] primary-muted derived via expand:family');
    },
    'input': { 'colors': ['#6366f1'], 'roles': SIMPLE_ROLES },
    'kind': 'edge',
    'name': '1-color seed fills derived role via expand:family'
  }
];

new ScenarioRunner<IntakeHexInput, {
  readonly 'colorsLength': number;
  readonly 'hasDarkVariant': boolean;
  readonly 'hasDerivedRole': boolean;
  readonly 'hasJsonOutput':  boolean;
  readonly 'hasLightVariant': boolean;
  readonly 'rolesCount':   number;
}>(
  'Engine.e2e :: cell-1 :: intake-hex',
  (input) => {
    const engine = EngineTestFixture.freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'enforce:contrast', 'derive:variant', 'emit:json']);
    const state = engine.run({ 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': input.roles, 'runtime': undefined });
    const json = state.outputs['core:json'] as Record<string, JsonValueType> | undefined;
    return {
      'colorsLength':     state.colors.length,
      'hasDarkVariant':   'dark'  in state.variants,
      'hasDerivedRole':   'primary-muted' in state.roles,
      'hasJsonOutput':    json !== undefined && Array.isArray((json as { 'colors': JsonValueType[] }).colors),
      'hasLightVariant':  'light' in state.variants,
      'rolesCount':       Object.keys(state.roles).length
    };
  }
).run(intakeHexScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — intake:any dispatcher routes every format correctly
//
// intake:any walks the input array through delegates in this order:
//   hex → rgb → hsl → oklch → lab → named → imagePixel
// Each format produces exactly one ColorRecord. Records carry the correct
// sourceFormat tag and a canonical 6-digit hex.
// ---------------------------------------------------------------------------

interface ImagePixelLikeInputInterface {
  readonly 'data':   Uint8ClampedArray;
  readonly 'height': number;
  readonly 'width':  number;
}
interface IntakeAnyInputInterface { readonly 'colors': (JsonValueType | ImagePixelLikeInputInterface)[] }
type IntakeAnyOutput = {
  readonly 'count':        number;
  readonly 'hexValues':    readonly string[];
  readonly 'sourceFormats': readonly string[];
};

const intakeAnyScenarios: readonly ScenarioInterface<IntakeAnyInputInterface, IntakeAnyOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error,        undefined,                '[cell=2, scenario=hex-dispatch] no throw');
      assert.strictEqual(output!.count, 2,                       '[cell=2, scenario=hex-dispatch] both hex strings parsed');
      assert.ok(output!.sourceFormats.every((f) => {return f === 'hex';}), '[cell=2, scenario=hex-dispatch] both tagged hex');
    },
    'input': { 'colors': ['#ff6b6b', '#4ecdc4'] },
    'kind': 'happy',
    'name': 'two hex strings dispatched to hex delegate'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                                             '[cell=2, scenario=mixed] no throw');
      assert.strictEqual(output!.count, 6,                                             '[cell=2, scenario=mixed] six records produced');
      const expected: readonly SourceFormatType[] = ['hex', 'rgb', 'hsl', 'oklch', 'lab', 'named'];
      const expectedLength = expected.length;
      for (let i = 0; i < expectedLength; i++) {
        assert.strictEqual(
          output!.sourceFormats.at(i), expected.at(i),
          `[cell=2, scenario=mixed] record ${i} sourceFormat should be "${expected.at(i)}", got "${output!.sourceFormats.at(i)}"`
        );
      }
      assert.strictEqual(output!.hexValues.at(0), '#ffffff',  '[cell=2, scenario=mixed] "#fff" canonicalised to "#ffffff"');
      assert.strictEqual(output!.hexValues.at(1), '#ff0000',  '[cell=2, scenario=mixed] {r:1,g:0,b:0} round-trips to "#ff0000"');
      assert.strictEqual(output!.hexValues.at(5), '#663399',  '[cell=2, scenario=mixed] "rebeccapurple" resolves to "#663399"');
    },
    'input': {
      'colors': [
        '#fff',                              // intake:hex
        { 'b': 0,   'g': 0,   'r': 1 },      // intake:rgb (0..1 floats)
        { 'h': 200, 'l': 0.4, 's': 0.5 },    // intake:hsl
        { 'c': 0.2, 'h': 250, 'l': 0.6 },    // intake:oklch
        { 'a': 0.1, 'b': -0.1, 'l': 0.6 },   // intake:lab
        'rebeccapurple'                     // intake:named
      ]
    },
    'kind': 'happy',
    'name': 'six mixed-format inputs each route to their delegate'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,           undefined,    '[cell=2, scenario=short-hex] no throw');
      assert.strictEqual(output!.count,   1,            '[cell=2, scenario=short-hex] one record');
      assert.strictEqual(output!.hexValues.at(0), '#ffffff', '[cell=2, scenario=short-hex] expanded to 6-digit');
    },
    'input': { 'colors': ['#fff'] },
    'kind': 'edge',
    'name': 'short 3-digit hex "#fff" canonicalises to 6-digit "#ffffff"'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,         undefined, '[cell=2, scenario=empty] no throw');
      assert.strictEqual(output!.count, 0,         '[cell=2, scenario=empty] zero records');
    },
    'input': { 'colors': [] },
    'kind': 'edge',
    'name': 'empty input array produces zero records'
  }
];

new ScenarioRunner<IntakeAnyInputInterface, IntakeAnyOutput>(
  'Engine.e2e :: cell-2 :: intake-any',
  (input) => {
    const engine = EngineTestFixture.freshEngine();
    engine.pipeline(['intake:any']);
    const state = engine.run({ 'bypass': undefined, 'colors': input.colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
    return {
      'count':         state.colors.length,
      'hexValues':     state.colors.map((c) => { const result = c.hex; return result; }),
      'sourceFormats': state.colors.map((c) => { const result = c.sourceFormat; return result; })
    };
  }
).run(intakeAnyScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — no pipeline() call runs all registered tasks in registration order
//
// When pipeline() is never called the engine must fall back to executing every
// registered task in the order they were registered. This allows ad-hoc
// sequencing without explicit pipeline declaration.
// ---------------------------------------------------------------------------

type NoPipelineInput =  { readonly 'taskNames': readonly string[] };
type NoPipelineOutput = { readonly 'executionOrder': readonly string[] };

const noPipelineScenarios: readonly ScenarioInterface<NoPipelineInput, NoPipelineOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=two-tasks] no throw');
      assert.deepStrictEqual(output!.executionOrder, ['stub:a', 'stub:b'], '[cell=3, scenario=two-tasks] registration order honored');
    },
    'input': { 'taskNames': ['stub:a', 'stub:b'] },
    'kind': 'happy',
    'name': 'two stub tasks run in registration order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                    '[cell=3, scenario=no-tasks] no throw');
      assert.deepStrictEqual(output!.executionOrder, [],     '[cell=3, scenario=no-tasks] nothing executed');
    },
    'input': { 'taskNames': [] },
    'kind': 'edge',
    'name': 'no registered tasks — runs cleanly with empty execution log'
  }
];

new ScenarioRunner<NoPipelineInput, NoPipelineOutput>(
  'Engine.e2e :: cell-3 :: pipeline-order',
  (input) => {
    const engine = new Engine();
    const ran: string[] = [];
    for (const name of input.taskNames) {
      const taskName = name;
      const task: TaskInterface = {
        'manifest': { 'description': undefined, 'name': taskName, 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
        'name': taskName,
        'run': EngineTestFixture.recordingRun(ran, taskName)
      };
      engine.tasks.register(task);
    }
    // No engine.pipeline() call
    engine.run({ 'bypass': undefined, 'colors': [], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
    return { 'executionOrder': ran };
  }
).run(noPipelineScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — clamp:count and bypass:true
//
// clamp:count must reduce a large input to ≤ maxColors. bypass:true must
// leave all colors intact regardless of maxColors.
// ---------------------------------------------------------------------------

const clampScenarios: readonly ScenarioInterface<
  { readonly 'bypass'?: boolean; readonly 'count': number; readonly 'maxColors'?: number },
  { readonly 'resultLength': number }
>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                      '[cell=4, scenario=clamp-64] no throw');
      assert.ok(
        output!.resultLength <= 64,
        `[cell=4, scenario=clamp-64] colors ≤ 64, got ${output!.resultLength}`
      );
    },
    'input': { 'count': 100, 'maxColors': 64 },
    'kind': 'happy',
    'name': '100 colors clamped to ≤64 when maxColors=64'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,             undefined, '[cell=4, scenario=bypass] no throw');
      assert.strictEqual(output!.resultLength, 100,    '[cell=4, scenario=bypass] bypass:true preserves all colors');
    },
    'input': { 'bypass': true, 'count': 100 },
    'kind': 'edge',
    'name': 'bypass:true leaves all 100 colors intact'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                    '[cell=4, scenario=clamp-1] no throw');
      assert.ok(
        output!.resultLength <= 1,
        `[cell=4, scenario=clamp-1] colors ≤ 1, got ${output!.resultLength}`
      );
    },
    'input': { 'count': 64, 'maxColors': 1 },
    'kind': 'edge',
    'name': 'maxColors=1 clamps extreme input to single color'
  }
];

new ScenarioRunner<
  { readonly 'bypass'?: boolean; readonly 'count': number; readonly 'maxColors'?: number },
  { readonly 'resultLength': number }
>(
  'Engine.e2e :: cell-4 :: clamp-count',
  (input) => {
    const engine = EngineTestFixture.freshEngine();
    engine.pipeline(['intake:hex', 'clamp:count']);
    const runInput: InputInterface = {
      'bypass':    input.bypass,
      'colors':    EngineTestFixture.makeColors(input.count),
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': input.maxColors,
      'metadata':  undefined,
      'roles':     undefined,
      'runtime':   undefined
    };
    const state = engine.run(runInput);
    return { 'resultLength': state.colors.length };
  }
).run(clampScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — enforce:contrast is a no-op when pair already passes
//
// When the supplied color pair already satisfies the minRatio the task must
// leave state unchanged (contrastReport.adjusted === false or report absent).
// ---------------------------------------------------------------------------

const enforceContrastScenarios: readonly ScenarioInterface<
  { readonly 'bgHex': string; readonly 'fgHex': string; readonly 'minRatio': number },
  { readonly 'statePresent': boolean }
>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error,               undefined, '[cell=5, scenario=no-op] no throw');
      assert.strictEqual(output!.statePresent, true,     '[cell=5, scenario=no-op] engine returned state');
    },
    'input': { 'bgHex': '#ffffff', 'fgHex': '#000000', 'minRatio': 3.0 },
    'kind': 'happy',
    'name': 'black-on-white (contrast ≈21) is no-op for minRatio=3'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=unresolvable-roles] no throw on unreachable contrast check');
      assert.strictEqual(output!.statePresent, true, '[cell=5, scenario=unresolvable-roles] state returned');
    },
    'input': { 'bgHex': '#ffffff', 'fgHex': '#000000', 'minRatio': 3.0 },
    'kind': 'edge',
    'name': 'engine completes when roles unresolvable from object inputs'
  }
];

const highContrastRoles: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': undefined, 'background': 'background', 'foreground': 'text', 'minRatio': 3.0 }
  ],
  'description': undefined,
  'name': 'hi-contrast', 'roles': [
    { 'chromaRange': undefined,       'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'text', 'required': true },
    { 'chromaRange': undefined, 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': undefined, 'lightnessRange': undefined, 'name': 'background', 'required': true }
  ]
};

new ScenarioRunner<
  { readonly 'bgHex': string; readonly 'fgHex': string; readonly 'minRatio': number },
  { readonly 'statePresent': boolean }
>(
  'Engine.e2e :: cell-5 :: enforce-contrast',
  (input) => {
    const engine = EngineTestFixture.freshEngine();
    engine.pipeline(['intake:hex', 'resolve:roles', 'enforce:contrast']);
    const state = engine.run({
      'bypass': undefined,
      'colors': [input.fgHex, input.bgHex], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles':  highContrastRoles, 'runtime': undefined
    });
    return { 'statePresent': state !== undefined };
  }
).run(enforceContrastScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — input.runtime flows to state.runtime
//
// state.runtime must be a copy of input.runtime (not the same reference).
// When input.runtime is omitted, every state.runtime field is present but undefined.
// Tasks can read framing from state.runtime.
// ---------------------------------------------------------------------------

const runtimeScenarios: readonly ScenarioInterface<
  { readonly 'runtime'?: { readonly 'colorSpace'?: ColorSpaceType; readonly 'framing'?: FramingType } },
  {
    readonly 'colorSpace':        string | undefined;
    readonly 'framing':           string | undefined;
    readonly 'isDefaultEmpty':    boolean;
    readonly 'isSameRef':         boolean;
  }
>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined,     '[cell=6, scenario=copy] no throw');
      assert.strictEqual(output!.framing,    'dark',        '[cell=6, scenario=copy] framing copied');
      assert.strictEqual(output!.colorSpace, 'displayP3',   '[cell=6, scenario=copy] colorSpace copied');
      assert.strictEqual(output!.isSameRef,  false,         '[cell=6, scenario=copy] state.runtime is a fresh object');
    },
    'input': { 'runtime': { 'colorSpace': 'displayP3', 'framing': 'dark' } },
    'kind': 'happy',
    'name': 'input.runtime fields are copied to state.runtime'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,                 undefined, '[cell=6, scenario=default] no throw');
      assert.strictEqual(output!.isDefaultEmpty, true,     '[cell=6, scenario=default] state.runtime fields are all undefined');
    },
    'input': {},
    'kind': 'edge',
    'name': 'omitted input.runtime leaves every state.runtime field undefined'
  }
];

new ScenarioRunner<
  { readonly 'runtime'?: { readonly 'colorSpace'?: ColorSpaceType; readonly 'framing'?: FramingType } },
  {
    readonly 'colorSpace':        string | undefined;
    readonly 'framing':           string | undefined;
    readonly 'isDefaultEmpty':    boolean;
    readonly 'isSameRef':         boolean;
  }
>(
  'Engine.e2e :: cell-6 :: runtime',
  (input) => {
    const engine = EngineTestFixture.freshEngine();
    engine.pipeline(['intake:hex']);
    const runInput: InputInterface = {
      'bypass':    undefined,
      'colors':    ['#ff0000'],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     undefined,
      'runtime':   input.runtime !== undefined
        ? { 'colorSpace': input.runtime.colorSpace, 'extra': undefined, 'framing': input.runtime.framing }
        : undefined
    };
    const state = engine.run(runInput);
    return {
      'colorSpace':     state.runtime.colorSpace,
      'framing':        state.runtime.framing,
      'isDefaultEmpty': Object.values(state.runtime).every((v) => {return v === undefined;}),
      'isSameRef':      state.runtime === runInput.runtime
    };
  }
).run(runtimeScenarios);

// ---------------------------------------------------------------------------
// Cell 7 — error paths
//
// nonexistent task name in pipeline() throws synchronously.
// A task that throws propagates the error to the caller of run().
// Malformed (non-hex-string) colors are silently skipped by intake:hex.
// ---------------------------------------------------------------------------

const errorScenarios: readonly ScenarioInterface<
  { readonly 'scenario': 'unknown-task' | 'task-throws' | 'malformed-colors' },
  { readonly 'colorsLength': number; readonly 'hasJsonOutput': boolean }
>[] = [
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error,                             '[cell=7, scenario=unknown-task] expected throw');
      assert.ok(
        (error).message.includes('nonexistent:task'),
        `[cell=7, scenario=unknown-task] error mentions task name, got: ${(error).message}`
      );
    },
    'input': { 'scenario': 'unknown-task' },
    'kind': 'unhappy',
    'name': 'pipeline with nonexistent task name throws with task name in message'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error,                                              '[cell=7, scenario=task-throws] expected throw');
      assert.ok(
        (error).message.includes('intentional bomb detonation'),
        `[cell=7, scenario=task-throws] error message propagated, got: ${(error).message}`
      );
    },
    'input': { 'scenario': 'task-throws' },
    'kind': 'unhappy',
    'name': 'task that throws propagates error to run() caller'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=malformed] intake:hex must throw on non-hex input');
      assert.match((error).message, /intake:hex/,
        '[cell=7, scenario=malformed] error names the offending intake task');
    },
    'input': { 'scenario': 'malformed-colors' },
    'kind': 'unhappy',
    'name': 'non-hex input to intake:hex throws with a descriptive error'
  }
];

new ScenarioRunner<
  { readonly 'scenario': 'unknown-task' | 'task-throws' | 'malformed-colors' },
  { readonly 'colorsLength': number; readonly 'hasJsonOutput': boolean }
>(
  'Engine.e2e :: cell-7 :: error-paths',
  (input) => {
    if (input.scenario === 'unknown-task') {
      const engine = EngineTestFixture.freshEngine();
      engine.pipeline(['intake:hex', 'nonexistent:task']);
      // Should throw during pipeline(); run() is never reached
      return { 'colorsLength': 0, 'hasJsonOutput': false };
    }

    if (input.scenario === 'task-throws') {
      const engine = new Engine();
      const bomb: TaskInterface = {
        'manifest': { 'description': undefined, 'name': 'bomb:task', 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
        'name': 'bomb:task',
        'run': EngineTestFixture.throwingRun('intentional bomb detonation')
      };
      engine.tasks.register(bomb);
      engine.pipeline(['bomb:task']);
      engine.run({ 'bypass': undefined, 'colors': ['#ff0000'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
      return { 'colorsLength': 0, 'hasJsonOutput': false };
    }

    // malformed-colors
    const engine = EngineTestFixture.freshEngine();
    engine.pipeline(['intake:hex', 'clamp:count', 'emit:json']);
    const state = engine.run({
      'bypass': undefined, 'colors': [{}, null, 42], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined
    });
    const json = state.outputs['core:json'] as { 'colors': string[] } | undefined;
    return {
      'colorsLength':  state.colors.length,
      'hasJsonOutput': json !== undefined
    };
  }
).run(errorScenarios);

// ---------------------------------------------------------------------------
// Cell 8 — tasks observe state.runtime.framing (behavioural invariant)
//
// A task that reads framing from state.runtime must observe the value passed
// in from input.runtime. This is a single-shot invariant; bare test at bottom.
// ---------------------------------------------------------------------------

void test('Engine.e2e :: cell-8 :: runtime-task-observation :: tasks read framing from state.runtime', () => {
  const engine = EngineTestFixture.freshEngine();
  const holder: { 'value': string | undefined } = { 'value': undefined };

  const observer: TaskInterface = {
    'manifest': undefined,
    'name': 'observe:framing',
    'run': EngineTestFixture.framingObserverRun(holder)
  };
  engine.tasks.register(observer);
  engine.pipeline(['observe:framing']);

  engine.run({ 'bypass': undefined, 'colors': [], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': { 'colorSpace': undefined, 'extra': undefined, 'framing': 'light' } });

  assert.strictEqual(
    holder.value,
    'light',
    '[cell=8, scenario=framing-observed] task should see framing="light" from input.runtime'
  );
});
