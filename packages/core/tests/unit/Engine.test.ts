/**
 * Engine — scenario-matrix suite.
 *
 * Subject: `Engine` (composition root). Drives task adoption, pipeline
 * ordering, hook routing, and `run()` execution. Each cell covers one
 * concern of the engine; scenarios within a cell exhaust the happy / edge /
 * unhappy matrix for that concern.
 *
 * Cells:
 *   1. adopt           — registers tasks, hooks, warns on duplicates
 *   2. pipeline        — validates known names and `requires` ordering
 *   3. run.execution   — order, hook firing, phase-task routing
 *   4. run.validation  — input/state schema rejection paths
 *   5. run.state-shape — preserved fields, default initialisation
 *   6. adopt cache     — invalidates cached pipeline sequence on shadow
 *   7. schema.adopt    — invalid manifest / plugin / contributed schema rejected at adopt
 *   8. schema.run      — plugin output/metadata schema violations rejected at run exit
 */

import type {
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  PluginInterface,
  SchemaInterfaceType,
  TaskInterface
} from '@studnicky/iridis';
import type { LogRecordType }  from '@studnicky/logger';
import type { JsonObjectType, JsonValueType } from '@studnicky/types';

import { Engine } from '@studnicky/iridis/engine';
import assert from 'node:assert/strict';
import { test }   from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Captures calls made to `console.warn` while installed, routing them
 * through a locally held reference so the underlying `console` global is
 * never accessed by member expression at the call site.
 */
class WarningCaptureSession {
  readonly 'warnings': string[] = [];

  private readonly consoleReference: Console;
  private readonly originalWarn:     Console['warn'];

  constructor() {
    this.consoleReference = console;
    this.originalWarn     = this.consoleReference.warn;
    this.consoleReference.warn = (message: string, _record: LogRecordType): void => {
      this.warnings.push(message);
    };
  }

  restore(): void {
    this.consoleReference.warn = this.originalWarn;
  }
}

class TestEngineFixture {
  static captureWarnings(): WarningCaptureSession {
    return new WarningCaptureSession();
  }

  static makeInput(extra: {
    readonly 'bypass'?:    InputInterface['bypass'];
    readonly 'colors'?:    InputInterface['colors'];
    readonly 'contrast'?:  InputInterface['contrast'];
    readonly 'emit'?:      InputInterface['emit'];
    readonly 'maxColors'?: InputInterface['maxColors'];
    readonly 'metadata'?:  InputInterface['metadata'];
    readonly 'roles'?:     InputInterface['roles'];
    readonly 'runtime'?:   InputInterface['runtime'];
  } = {}): InputInterface {
    return {
      'bypass':    undefined,
      'colors':    ['#ff0000'],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     undefined,
      'runtime':   undefined,
      ...extra
    };
  }

  static malformedSchemaType(type: JsonValueType): SchemaInterfaceType {
    const schema: SchemaInterfaceType = {};
    if (!Reflect.set(schema, 'type', type)) {
      throw new TypeError('Unable to create malformed schema fixture.');
    }
    return schema;
  }

  static makePlugin(name: string, tasks: readonly TaskInterface[]): PluginInterface {
    const listTasks = (): readonly TaskInterface[] => { return [...tasks]; };
    return {
      'name':    name,
      'tasks':   listTasks,
      'version': '0.0.1'
    };
  }

  static makeTask(
    name:     string,
    options?: {
      'onRun'?:    (state: PaletteStateInterface, context: PipelineContextInterface) => void;
      'phase'?:    'onRunStart' | 'onRunEnd';
      'requires'?: string[];
    }
  ): TaskInterface {
    const run = (state: PaletteStateInterface, context: PipelineContextInterface): void => {
      options?.onRun?.(state, context);
    };
    return {
      'manifest': {
        'description': undefined,
        'name':        name,
        'phase':       options?.phase,
        'reads':       undefined,
        'requires':    options?.requires,
        'writes':      undefined
      },
      'name': name,
      'run':  run
    };
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — adopt routes tasks to registry and hooks
//
// `Engine.adopt(plugin)` walks every task the plugin returns. Tasks with
// `manifest.phase` are stored on the matching hook channel; all others go
// into the main registry. Re-adopting a plugin name MUST emit a console
// warning so consumers see the shadow.
// ---------------------------------------------------------------------------

interface AdoptInputInterface {
  readonly 'plugins': readonly PluginInterface[];
}
type AdoptOutput = {
  readonly 'onRunEnd':      readonly string[];
  readonly 'onRunStart':    readonly string[];
  readonly 'registered':    readonly string[];
  readonly 'warnings':      readonly string[];
};

const adoptScenarios: readonly ScenarioInterface<AdoptInputInterface, AdoptOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=single-task] no throw');
      assert.deepStrictEqual(output!.registered, ['task:a'], '[cell=1, scenario=single-task] registered list');
      assert.strictEqual(output!.onRunStart.length, 0, '[cell=1, scenario=single-task] no hooks');
      assert.strictEqual(output!.onRunEnd.length,   0, '[cell=1, scenario=single-task] no hooks');
    },
    'input': { 'plugins': [TestEngineFixture.makePlugin('p', [TestEngineFixture.makeTask('task:a')])] },
    'kind': 'happy',
    'name': 'single plugin with one task registers it'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=multi-plugin] no throw');
      assert.deepStrictEqual(
        [...output!.registered].sort(),
        ['task:a', 'task:b'],
        '[cell=1, scenario=multi-plugin] both tasks registered'
      );
    },
    'input': {
      'plugins': [
        TestEngineFixture.makePlugin('a', [TestEngineFixture.makeTask('task:a')]),
        TestEngineFixture.makePlugin('b', [TestEngineFixture.makeTask('task:b')])
      ]
    },
    'kind': 'happy',
    'name': 'multiple plugins accumulate all tasks'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                       '[cell=1, scenario=hook-start] no throw');
      assert.deepStrictEqual(output!.onRunStart, ['hook:start'], '[cell=1, scenario=hook-start] in start channel');
      assert.strictEqual(output!.onRunEnd.length, 0,             '[cell=1, scenario=hook-start] not in end channel');
      assert.deepStrictEqual(output!.registered, ['hook:start'], '[cell=1, scenario=hook-start] also name-addressable in entries');
    },
    'input': {
      'plugins': [TestEngineFixture.makePlugin('p', [TestEngineFixture.makeTask('hook:start', { 'phase': 'onRunStart' })])]
    },
    'kind': 'happy',
    'name': 'onRunStart task routed to start channel and remains name-addressable'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=hook-end] no throw');
      assert.deepStrictEqual(output!.onRunEnd,   ['hook:end'], '[cell=1, scenario=hook-end] in end channel');
      assert.strictEqual(output!.onRunStart.length, 0,         '[cell=1, scenario=hook-end] not in start channel');
    },
    'input': {
      'plugins': [TestEngineFixture.makePlugin('p', [TestEngineFixture.makeTask('hook:end', { 'phase': 'onRunEnd' })])]
    },
    'kind': 'happy',
    'name': 'onRunEnd task routes through hook channel'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=mixed] no throw');
      assert.deepStrictEqual(
        [...output!.registered].sort(),
        ['hook:end', 'hook:start', 'task:work'],
        '[cell=1, scenario=mixed] every task is name-addressable'
      );
      assert.deepStrictEqual(output!.onRunStart, ['hook:start'], '[cell=1, scenario=mixed] start hook routed');
      assert.deepStrictEqual(output!.onRunEnd,   ['hook:end'],   '[cell=1, scenario=mixed] end hook routed');
    },
    'input': {
      'plugins': [TestEngineFixture.makePlugin('p', [
        TestEngineFixture.makeTask('hook:start', { 'phase': 'onRunStart' }),
        TestEngineFixture.makeTask('task:work'),
        TestEngineFixture.makeTask('hook:end',   { 'phase': 'onRunEnd' })
      ])]
    },
    'kind': 'happy',
    'name': 'mixed phased and ordinary tasks split correctly'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,             '[cell=1, scenario=empty] no throw');
      assert.strictEqual(output!.registered.length, 0, '[cell=1, scenario=empty] nothing registered');
    },
    'input': { 'plugins': [TestEngineFixture.makePlugin('empty', [])] },
    'kind': 'edge',
    'name': 'empty plugin (no tasks) is accepted without side effects'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=dup] no throw on re-adopt');
      assert.strictEqual(output!.warnings.length, 1, '[cell=1, scenario=dup] one warning emitted');
      assert.match(output!.warnings.at(0) ?? '', /dup/, '[cell=1, scenario=dup] plugin name in warning');
      assert.match(output!.warnings.at(0) ?? '', /already adopted/, '[cell=1, scenario=dup] explains state');
    },
    'input': {
      'plugins': [
        TestEngineFixture.makePlugin('dup', [TestEngineFixture.makeTask('task:x')]),
        TestEngineFixture.makePlugin('dup', [TestEngineFixture.makeTask('task:y')])
      ]
    },
    'kind': 'edge',
    'name': 're-adopting same plugin name warns'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=invalid-plugin] expected throw');
      assert.match((error).message, /plugin invalid/, '[cell=1, scenario=invalid-plugin] message shape');
    },
    'input': {
      'plugins': [{
        'tasks': function(): readonly TaskInterface[] { return []; },
        'version': '0.0.1'
      } as PluginInterface]
    },
    'kind': 'unhappy',
    'name': 'plugin missing required name field throws schema error'
  }
];

new ScenarioRunner<AdoptInputInterface, AdoptOutput>(
  'Engine :: cell-1 :: adopt',
  (input) => {
    const engine   = new Engine();
    const warningCapture = TestEngineFixture.captureWarnings();
    try {
      for (const plugin of input.plugins) {
        engine.adopt(plugin);
      }
      const registered = engine.tasks.list().map((m) => { const result = m.name; return result; });
      const onRunStart = engine.tasks.hooks('onRunStart').map((t) => { const result = t.name; return result; });
      const onRunEnd   = engine.tasks.hooks('onRunEnd').map((t) => { const result = t.name; return result; });
      return { 'onRunEnd': onRunEnd, 'onRunStart': onRunStart, 'registered': registered, 'warnings': warningCapture.warnings };
    } finally {
      warningCapture.restore();
    }
  }
).run(adoptScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — pipeline validation and requires-ordering
//
// `Engine.pipeline(order)` validates:
//   - every name is registered (throws on unknown)
//   - `manifest.requires` predecessors appear earlier (throws on violation)
//   - missing required predecessor throws with clear message
//   - non-registered names in `requires` are treated as documentation (math
//     primitives) and skipped — they MUST NOT trigger ordering checks
// ---------------------------------------------------------------------------

interface PipelineInputInterface {
  readonly 'order': readonly string[];
  readonly 'tasks': readonly TaskInterface[];
}

const pipelineScenarios: readonly ScenarioInterface<PipelineInputInterface, { readonly 'accepted': boolean }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,        '[cell=2, scenario=known] no throw');
      assert.strictEqual(output!.accepted, true,  '[cell=2, scenario=known] accepted');
    },
    'input': {
      'order': ['a', 'b'],
      'tasks': [TestEngineFixture.makeTask('a'), TestEngineFixture.makeTask('b')]
    },
    'kind': 'happy',
    'name': 'order with all known names accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=requires-ok] no throw');
      assert.strictEqual(output!.accepted, true, '[cell=2, scenario=requires-ok] accepted');
    },
    'input': {
      'order': ['dep', 'consumer'],
      'tasks': [TestEngineFixture.makeTask('dep'), TestEngineFixture.makeTask('consumer', { 'requires': ['dep'] })]
    },
    'kind': 'happy',
    'name': 'requires predecessor placed before dependent accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=math-prim] no throw');
      assert.strictEqual(output!.accepted, true, '[cell=2, scenario=math-prim] math primitive ignored for ordering');
    },
    'input': {
      'order': ['uses-math'],
      'tasks': [TestEngineFixture.makeTask('uses-math', { 'requires': ['someMathPrimitive'] })]
    },
    'kind': 'edge',
    'name': 'requires entry referring to non-registered name (math primitive) is skipped'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=empty] no throw');
      assert.strictEqual(output!.accepted, true, '[cell=2, scenario=empty] empty order ok');
    },
    'input': { 'order': [], 'tasks': [] },
    'kind': 'edge',
    'name': 'empty order accepted'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=unknown] expected throw');
      assert.match((error).message, /ghost/,           '[cell=2, scenario=unknown] names the task');
      assert.match((error).message, /not registered/,  '[cell=2, scenario=unknown] explains failure');
    },
    'input': { 'order': ['ghost'], 'tasks': [] },
    'kind': 'unhappy',
    'name': 'unknown name in order throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=requires-violated] expected throw');
      const message = (error).message;
      assert.match(message, /consumer/,            '[cell=2, scenario=requires-violated] dependent named');
      assert.match(message, /dep/,                 '[cell=2, scenario=requires-violated] dependency named');
      assert.match(message, /must appear earlier/, '[cell=2, scenario=requires-violated] explains ordering');
    },
    'input': {
      'order': ['consumer', 'dep'],
      'tasks': [TestEngineFixture.makeTask('dep'), TestEngineFixture.makeTask('consumer', { 'requires': ['dep'] })]
    },
    'kind': 'unhappy',
    'name': 'required predecessor placed after dependent throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=requires-missing] expected throw');
      const message = (error).message;
      assert.match(message, /dep/,                       '[cell=2, scenario=requires-missing] dependency named');
      assert.match(message, /missing from the pipeline/, '[cell=2, scenario=requires-missing] explains absence');
    },
    'input': {
      'order': ['consumer'],
      'tasks': [TestEngineFixture.makeTask('dep'), TestEngineFixture.makeTask('consumer', { 'requires': ['dep'] })]
    },
    'kind': 'unhappy',
    'name': 'required predecessor missing from order entirely throws'
  }
];

new ScenarioRunner<PipelineInputInterface, { readonly 'accepted': boolean }>(
  'Engine :: cell-2 :: pipeline',
  (input) => {
    const engine = new Engine();
    if (input.tasks.length > 0) {
      engine.adopt(TestEngineFixture.makePlugin('p', input.tasks));
    }
    engine.pipeline(input.order);
    return { 'accepted': true };
  }
).run(pipelineScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — run() execution ordering and hook firing
//
// `Engine.run(input)` must:
//   - execute onRunStart hooks before main pipeline
//   - execute main pipeline in the declared order
//   - execute onRunEnd hooks after main pipeline
//   - skip phase-marked tasks in the main loop (they fire only via hooks)
//   - succeed with an empty pipeline (no tasks, no hooks)
// ---------------------------------------------------------------------------

type RunExecInput = {
  readonly 'order': readonly string[];
  readonly 'tasks': readonly { 'name': string; 'phase'?: 'onRunStart' | 'onRunEnd' }[];
};
type RunExecOutput = {
  readonly 'executionOrder': readonly string[];
};

const runExecScenarios: readonly ScenarioInterface<RunExecInput, RunExecOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=order] no throw');
      assert.deepStrictEqual(output!.executionOrder, ['c', 'a', 'b'], '[cell=3, scenario=order] declared order honoured');
    },
    'input': {
      'order': ['c', 'a', 'b'],
      'tasks': [{ 'name': 'a' }, { 'name': 'b' }, { 'name': 'c' }]
    },
    'kind': 'happy',
    'name': 'main pipeline runs in declared order'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=start-hook] no throw');
      assert.deepStrictEqual(
        output!.executionOrder,
        ['hook:start', 'task:main'],
        '[cell=3, scenario=start-hook] hook precedes main'
      );
    },
    'input': {
      'order': ['task:main'],
      'tasks': [
        { 'name': 'hook:start', 'phase': 'onRunStart' },
        { 'name': 'task:main' }
      ]
    },
    'kind': 'happy',
    'name': 'onRunStart hook fires before main task'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=end-hook] no throw');
      assert.deepStrictEqual(
        output!.executionOrder,
        ['task:main', 'hook:end'],
        '[cell=3, scenario=end-hook] hook follows main'
      );
    },
    'input': {
      'order': ['task:main'],
      'tasks': [
        { 'name': 'task:main' },
        { 'name': 'hook:end', 'phase': 'onRunEnd' }
      ]
    },
    'kind': 'happy',
    'name': 'onRunEnd hook fires after main task'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=bracket] no throw');
      assert.deepStrictEqual(
        output!.executionOrder,
        ['hook:start', 'task:work', 'hook:end'],
        '[cell=3, scenario=bracket] start → work → end'
      );
    },
    'input': {
      'order': ['task:work'],
      'tasks': [
        { 'name': 'hook:start', 'phase': 'onRunStart' },
        { 'name': 'task:work' },
        { 'name': 'hook:end',   'phase': 'onRunEnd' }
      ]
    },
    'kind': 'happy',
    'name': 'both hooks bracket main pipeline'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=phase-in-order] no throw');
      assert.deepStrictEqual(
        output!.executionOrder,
        ['task:lifecycle'],
        '[cell=3, scenario=phase-in-order] fires exactly once via hook channel (main loop skips)'
      );
    },
    'input': {
      'order': ['task:lifecycle'],
      'tasks': [{ 'name': 'task:lifecycle', 'phase': 'onRunStart' }]
    },
    'kind': 'edge',
    'name': 'phase-marked task included in pipeline order runs only via hook'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=empty] no throw');
      assert.deepStrictEqual(output!.executionOrder, [], '[cell=3, scenario=empty] no executions');
    },
    'input': { 'order': [], 'tasks': [] },
    'kind': 'edge',
    'name': 'empty pipeline still completes'
  }
];

new ScenarioRunner<RunExecInput, RunExecOutput>(
  'Engine :: cell-3 :: run.execution',
  (input) => {
    const engine = new Engine();
    const executionOrder: string[] = [];
    if (input.tasks.length > 0) {
      const tasks = input.tasks.map((t) => {
        const onRun = (): void => { executionOrder.push(t.name); };
        const result = TestEngineFixture.makeTask(t.name, {
          ...(t.phase !== undefined ? { 'phase': t.phase } : {}),
          'onRun': onRun
        });
        return result;
      });
      engine.adopt(TestEngineFixture.makePlugin('p', tasks));
      engine.pipeline(input.order);
    }
    engine.run(TestEngineFixture.makeInput());
    return { 'executionOrder': executionOrder };
  }
).run(runExecScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — run() input validation rejection paths
//
// `Engine.run(input)` validates input against `InputSchema` at entry. A
// malformed input MUST surface as a thrown Error naming the validation
// context.
// ---------------------------------------------------------------------------

interface RunValidationInputInterface {
  readonly 'input': JsonObjectType;
}
interface RunValidationOutputInterface {
  readonly 'state': PaletteStateInterface;
}

const runValidationScenarios: readonly ScenarioInterface<RunValidationInputInterface, RunValidationOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                                  '[cell=4, scenario=valid] no throw');
      assert.ok(output !== undefined,                                       '[cell=4, scenario=valid] output present');
      assert.deepStrictEqual(output.state.metadata.seed, 'green',       '[cell=4, scenario=valid] metadata preserved');
    },
    'input': { 'input': TestEngineFixture.makeInput({ 'metadata': { 'seed': 'green' } }) as object as JsonObjectType },
    'kind': 'happy',
    'name': 'well-formed input passes validation'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=4, scenario=missing-colors] expected throw');
      assert.match((error).message, /input invalid/, '[cell=4, scenario=missing-colors] message names context');
    },
    'input': { 'input': {} },
    'kind': 'unhappy',
    'name': 'input missing colors field throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=4, scenario=colors-non-array] expected throw');
      assert.match((error).message, /input invalid/, '[cell=4, scenario=colors-non-array] message names context');
    },
    'input': { 'input': { 'colors': 'not-an-array' } },
    'kind': 'unhappy',
    'name': 'input colors is non-array throws'
  }
];

new ScenarioRunner<RunValidationInputInterface, RunValidationOutputInterface>(
  'Engine :: cell-4 :: run.validation',
  (input) => {
    const engine = new Engine();
    const state = engine.run(input.input as object as InputInterface);
    return { 'state': state };
  }
).run(runValidationScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — run() state shape and field defaults
//
// The state object returned by `Engine.run()` MUST:
//   - reference the same `input` object passed in (identity)
//   - default `colors` to [], `roles`/`variants`/`outputs` to {}
//   - merge `input.metadata` into `state.metadata`
//   - copy `input.runtime` into a fresh object (defensive)
// ---------------------------------------------------------------------------

interface StateShapeInputInterface {
  readonly 'input': InputInterface;
}
interface StateShapeOutputInterface {
  readonly 'inputIsSameRef':  boolean;
  readonly 'runtimeIsSameRef': boolean;
  readonly 'state':           PaletteStateInterface;
}

const stateShapeScenarios: readonly ScenarioInterface<StateShapeInputInterface, StateShapeOutputInterface>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                '[cell=5, scenario=baseline] no throw');
      assert.strictEqual(output!.inputIsSameRef, true,    '[cell=5, scenario=baseline] input identity preserved');
      assert.deepStrictEqual(output!.state.colors,   [],  '[cell=5, scenario=baseline] colors default empty');
      assert.deepStrictEqual(output!.state.roles,    {},  '[cell=5, scenario=baseline] roles default empty');
      assert.deepStrictEqual(output!.state.variants, {},  '[cell=5, scenario=baseline] variants default empty');
      assert.deepStrictEqual(output!.state.outputs,  {},  '[cell=5, scenario=baseline] outputs default empty');
    },
    'input': { 'input': TestEngineFixture.makeInput() },
    'kind': 'happy',
    'name': 'empty pipeline produces baseline state shape'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=metadata] no throw');
      assert.strictEqual(output!.state.metadata.seed,   'violet', '[cell=5, scenario=metadata] seed preserved');
      assert.strictEqual(output!.state.metadata.marker, 'tagged', '[cell=5, scenario=metadata] marker preserved');
    },
    'input': { 'input': TestEngineFixture.makeInput({ 'metadata': { 'marker': 'tagged', 'seed': 'violet' } }) },
    'kind': 'happy',
    'name': 'caller metadata flows into state.metadata'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                                  '[cell=5, scenario=runtime-clone] no throw');
      assert.deepStrictEqual(output!.state.runtime, { 'colorSpace': undefined, 'extra': undefined, 'framing': 'dark' }, '[cell=5, scenario=runtime-clone] values copied');
      assert.strictEqual(output!.runtimeIsSameRef, false,                   '[cell=5, scenario=runtime-clone] fresh object, not aliased');
    },
    'input': { 'input': TestEngineFixture.makeInput({ 'runtime': { 'colorSpace': undefined, 'extra': undefined, 'framing': 'dark' } }) },
    'kind': 'edge',
    'name': 'state.runtime is a fresh object (not the same reference as input.runtime)'
  }
];

new ScenarioRunner<StateShapeInputInterface, StateShapeOutputInterface>(
  'Engine :: cell-5 :: run.state-shape',
  (input) => {
    const engine = new Engine();
    const state  = engine.run(input.input);
    return {
      'inputIsSameRef':    state.input    === input.input,
      'runtimeIsSameRef':  state.runtime  === input.input.runtime,
      'state': state
    };
  }
).run(stateShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — adopt invalidates cached pipeline sequence
//
// `Engine.adopt` after a `pipeline()` call must invalidate the cached
// sequence so subsequent `run()` calls resolve against the current
// registry (allowing plugin shadowing). Single-shot behavioural invariant
// — bare test rather than a table row since the side-effect is the assertion.
// ---------------------------------------------------------------------------

void test('Engine :: cell-6 :: shadow :: adopt-after-pipeline rebuilds sequence on next run', () => {
  const engine = new Engine();
  const calls: string[] = [];

  const onRunOriginal = (): void => { calls.push('original'); };
  engine.adopt(TestEngineFixture.makePlugin('original', [
    TestEngineFixture.makeTask('task:t', { 'onRun': onRunOriginal })
  ]));
  engine.pipeline(['task:t']);

  const warningCapture = TestEngineFixture.captureWarnings();
  try {
    const onRunShadow = (): void => { calls.push('shadow'); };
    engine.adopt(TestEngineFixture.makePlugin('shadow', [
      TestEngineFixture.makeTask('task:t', { 'onRun': onRunShadow })
    ]));
  } finally {
    warningCapture.restore();
  }

  engine.run(TestEngineFixture.makeInput());

  assert.deepStrictEqual(
    calls,
    ['shadow'],
    '[cell=6, scenario=shadow] post-adopt run must execute the shadowing task, not the cached original'
  );
});

// ---------------------------------------------------------------------------
// Cell 7 — schema.adopt: invalid manifest / plugin / contributed schema rejected
//
// Engine.adopt() must reject plugins that fail schema validation at each
// boundary. Three sub-scenarios:
//   a. Task with invalid manifest (empty name) → throws at adopt
//   b. Plugin with malformed contributed output schema → throws at adopt
//   c. Well-formed plugin with valid schemas → adopt succeeds
// ---------------------------------------------------------------------------

void test('Engine :: cell-7 :: schema.adopt :: unhappy :: task with empty-string name in manifest rejected', () => {
  const engine = new Engine();
  const run   = (): void => { /* no-op */ };
  const tasks = (): readonly TaskInterface[] => {
    return [{
      'manifest': { 'description': undefined, 'name': '', 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },   // minLength: 1 — should reject
      'name': 'task:bad',
      'run': run
    }];
  };
  const plugin: PluginInterface = {
    'name':    'bad-manifest-plugin',
    'tasks':   tasks,
    'version': '0.1.0'
  };
  assert.throws(
    () => { const result = engine.adopt(plugin); return result; },
    (error: Error) => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes('manifest invalid'), `[cell=7, scenario=empty-name] got: ${error.message}`);
      return true;
    },
    '[cell=7, scenario=empty-name] adopt must throw on invalid manifest'
  );
});

void test('Engine :: cell-7 :: schema.adopt :: unhappy :: malformed contributed type keywords rejected', () => {
  const malformedSchemas: readonly SchemaInterfaceType[] = [
    TestEngineFixture.malformedSchemaType('INVALID_TYPE_VALUE_THAT_IS_NOT_VALID'),
    TestEngineFixture.malformedSchemaType(42),
    TestEngineFixture.malformedSchemaType({}),
    TestEngineFixture.malformedSchemaType(null),
    TestEngineFixture.malformedSchemaType([]),
    TestEngineFixture.malformedSchemaType(['string', 'string']),
    TestEngineFixture.malformedSchemaType(['string', 'INVALID_TYPE_VALUE_THAT_IS_NOT_VALID']),
    {
      '$defs': { 'nested': TestEngineFixture.malformedSchemaType(42) },
      'type': 'object'
    }
  ];

  for (const [index, malformedSchema] of malformedSchemas.entries()) {
    const engine = new Engine();
    const schemas = (): ReturnType<Exclude<PluginInterface['schemas'], undefined>> => {
      return {
        'metadata': undefined,
        'outputs': { 'bad': malformedSchema }
      };
    };
    const tasks = (): readonly TaskInterface[] => { return []; };
    const plugin: PluginInterface = {
      'name':    `bad-schema-plugin-${index}`,
      'schemas': schemas,
      'tasks':   tasks,
      'version': '0.1.0'
    };
    assert.throws(
      () => { const result = engine.adopt(plugin); return result; },
      (error: Error) => {
        assert.ok(error instanceof Error);
        assert.ok(
          error.message.includes('malformed') || error.message.includes('schema'),
          `[cell=7, scenario=malformed-schema-${index}] got: ${error.message}`
        );
        return true;
      },
      `[cell=7, scenario=malformed-schema-${index}] adopt must throw on malformed type keyword`
    );
  }
});

void test('Engine :: cell-7 :: schema.adopt :: happy :: well-formed plugin with schemas() accepted', () => {
  const engine = new Engine();
  const schemas = (): ReturnType<Exclude<PluginInterface['schemas'], undefined>> => {
    return {
      'metadata': { 'myMeta':  { 'type': 'string' } },
      'outputs':  { 'mySlot':  { 'type': 'object' } }
    };
  };
  const tasks = (): readonly TaskInterface[] => { return []; };
  const plugin: PluginInterface = {
    'name':    'good-schema-plugin',
    'schemas': schemas,
    'tasks':   tasks,
    'version': '0.1.0'
  };
  assert.doesNotThrow(
    () => { const result = engine.adopt(plugin); return result; },
    '[cell=7, scenario=good-schemas] well-formed plugin with schemas accepted'
  );
});

// ---------------------------------------------------------------------------
// Cell 8 — schema.run: plugin output/metadata schema violations rejected
//
// Engine.run() validates plugin-contributed output and metadata slots
// against their registered schemas at run exit. Violations must throw.
//
//   a. Output slot violates plugin schema → run() throws
//   b. Metadata slot violates plugin schema → run() throws
//   c. Conforming output/metadata → run() succeeds
// ---------------------------------------------------------------------------

void test('Engine :: cell-8 :: schema.run :: unhappy :: output failing plugin schema rejected at run exit', () => {
  const engine = new Engine();

  const run = (state: PaletteStateInterface): void => {
    state.outputs.mySlot = { 'required_string': 42 };  // number, not string
  };
  const schemas = (): ReturnType<Exclude<PluginInterface['schemas'], undefined>> => {
    return {
      'metadata': undefined, 'outputs': {
        'mySlot': {
          'properties': { 'required_string': { 'type': 'string' } },
          'required': ['required_string'],
          'type': 'object'
        }
      }
    };
  };
  const tasks = (): readonly TaskInterface[] => {
    return [{
      'manifest': { 'description': undefined, 'name': 'task:write-bad-output', 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'task:write-bad-output',
      'run': run
    }];
  };
  const plugin: PluginInterface = {
    'name':    'output-validator-plugin',
    'schemas': schemas,
    'tasks':   tasks,
    'version': '0.1.0'
  };

  engine.adopt(plugin);
  engine.pipeline(['task:write-bad-output']);

  assert.throws(
    () => { engine.run(TestEngineFixture.makeInput()); },
    (error: Error) => {
      assert.ok(error instanceof Error);
      assert.ok(
        error.message.includes("outputs['mySlot']"),
        `[cell=8, scenario=bad-output] expected outputs slot in error, got: ${error.message}`
      );
      return true;
    },
    '[cell=8, scenario=bad-output] run must throw when output fails plugin schema'
  );
});

void test('Engine :: cell-8 :: schema.run :: unhappy :: metadata failing plugin schema rejected at run exit', () => {
  const engine = new Engine();

  const run = (state: PaletteStateInterface): void => {
    state.metadata.myMeta = { 'score': 'not-a-number' };  // string, not number
  };
  const schemas = (): ReturnType<Exclude<PluginInterface['schemas'], undefined>> => {
    return {
      'metadata': {
        'myMeta': {
          'properties': { 'score': { 'type': 'number' } },
          'required': ['score'],
          'type': 'object'
        }
      }, 'outputs': undefined
    };
  };
  const tasks = (): readonly TaskInterface[] => {
    return [{
      'manifest': { 'description': undefined, 'name': 'task:write-bad-meta', 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'task:write-bad-meta',
      'run': run
    }];
  };
  const plugin: PluginInterface = {
    'name':    'meta-validator-plugin',
    'schemas': schemas,
    'tasks':   tasks,
    'version': '0.1.0'
  };

  engine.adopt(plugin);
  engine.pipeline(['task:write-bad-meta']);

  assert.throws(
    () => { engine.run(TestEngineFixture.makeInput()); },
    (error: Error) => {
      assert.ok(error instanceof Error);
      assert.ok(
        error.message.includes("metadata['myMeta']"),
        `[cell=8, scenario=bad-meta] expected metadata slot in error, got: ${error.message}`
      );
      return true;
    },
    '[cell=8, scenario=bad-meta] run must throw when metadata fails plugin schema'
  );
});

void test('Engine :: cell-8 :: schema.run :: happy :: conforming output and metadata pass validation', () => {
  const engine = new Engine();

  const run = (state: PaletteStateInterface): void => {
    state.outputs.goodSlot  = { 'label': 'hello' };
    state.metadata.goodMeta = { 'count': 42 };
  };
  const schemas = (): ReturnType<Exclude<PluginInterface['schemas'], undefined>> => {
    return {
      'metadata': { 'goodMeta':  { 'properties': { 'count': { 'type': 'number' } }, 'type': 'object' } },
      'outputs':  { 'goodSlot':  { 'properties': { 'label': { 'type': 'string' } }, 'type': 'object' } }
    };
  };
  const tasks = (): readonly TaskInterface[] => {
    return [{
      'manifest': { 'description': undefined, 'name': 'task:write-good', 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'task:write-good',
      'run': run
    }];
  };
  const plugin: PluginInterface = {
    'name':    'conforming-plugin',
    'schemas': schemas,
    'tasks':   tasks,
    'version': '0.1.0'
  };

  engine.adopt(plugin);
  engine.pipeline(['task:write-good']);

  const state = engine.run(TestEngineFixture.makeInput());
  assert.deepStrictEqual(
    (state.outputs.goodSlot as JsonObjectType).label,
    'hello',
    '[cell=8, scenario=good] output slot accessible after valid run'
  );
});
