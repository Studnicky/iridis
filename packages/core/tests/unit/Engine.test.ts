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
  TaskInterface,
} from '@studnicky/iridis';
import { Engine }    from '@studnicky/iridis/engine';
import { test }      from 'node:test';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTask(
  name:     string,
  options?: {
    phase?:    'onRunStart' | 'onRunEnd';
    requires?: string[];
    onRun?:    (state: PaletteStateInterface, ctx: PipelineContextInterface) => void;
  },
): TaskInterface {
  return {
    'name':     name,
    'manifest': {
      'description': undefined,
      'name':        name,
      'phase':       options?.phase,
      'reads':       undefined,
      'requires':    options?.requires,
      'writes':      undefined
    },
    run(state, ctx) { options?.onRun?.(state, ctx); },
  };
}

function makePlugin(name: string, tasks: readonly TaskInterface[]): PluginInterface {
  return {
    'name':    name,
    'version': '0.0.1',
    tasks(): readonly TaskInterface[] { return tasks; },
  };
}

function makeInput(extra: Partial<InputInterface> = {}): InputInterface {
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

// ---------------------------------------------------------------------------
// Cell 1 — adopt routes tasks to registry and hooks
//
// `Engine.adopt(plugin)` walks every task the plugin returns. Tasks with
// `manifest.phase` are stored on the matching hook channel; all others go
// into the main registry. Re-adopting a plugin name MUST emit a console
// warning so consumers see the shadow.
// ---------------------------------------------------------------------------

interface AdoptInput  {
  readonly plugins: readonly PluginInterface[];
}
interface AdoptOutput {
  readonly registered:    readonly string[];
  readonly onRunStart:    readonly string[];
  readonly onRunEnd:      readonly string[];
  readonly warnings:      readonly string[];
}

const adoptScenarios: readonly ScenarioInterface<AdoptInput, AdoptOutput>[] = [
  {
    name: 'single plugin with one task registers it',
    kind: 'happy',
    input: { plugins: [makePlugin('p', [makeTask('task:a')])] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=single-task] no throw');
      assert.deepStrictEqual(output!.registered, ['task:a'], '[cell=1, scenario=single-task] registered list');
      assert.strictEqual(output!.onRunStart.length, 0, '[cell=1, scenario=single-task] no hooks');
      assert.strictEqual(output!.onRunEnd.length,   0, '[cell=1, scenario=single-task] no hooks');
    },
  },
  {
    name: 'multiple plugins accumulate all tasks',
    kind: 'happy',
    input: {
      plugins: [
        makePlugin('a', [makeTask('task:a')]),
        makePlugin('b', [makeTask('task:b')]),
      ],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=multi-plugin] no throw');
      assert.deepStrictEqual(
        [...output!.registered].sort(),
        ['task:a', 'task:b'],
        '[cell=1, scenario=multi-plugin] both tasks registered',
      );
    },
  },
  {
    name: 'onRunStart task routed to start channel and remains name-addressable',
    kind: 'happy',
    input: {
      plugins: [makePlugin('p', [makeTask('hook:start', { phase: 'onRunStart' })])],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,                       '[cell=1, scenario=hook-start] no throw');
      assert.deepStrictEqual(output!.onRunStart, ['hook:start'], '[cell=1, scenario=hook-start] in start channel');
      assert.strictEqual(output!.onRunEnd.length, 0,             '[cell=1, scenario=hook-start] not in end channel');
      assert.deepStrictEqual(output!.registered, ['hook:start'], '[cell=1, scenario=hook-start] also name-addressable in entries');
    },
  },
  {
    name: 'onRunEnd task routes through hook channel',
    kind: 'happy',
    input: {
      plugins: [makePlugin('p', [makeTask('hook:end', { phase: 'onRunEnd' })])],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=hook-end] no throw');
      assert.deepStrictEqual(output!.onRunEnd,   ['hook:end'], '[cell=1, scenario=hook-end] in end channel');
      assert.strictEqual(output!.onRunStart.length, 0,         '[cell=1, scenario=hook-end] not in start channel');
    },
  },
  {
    name: 'mixed phased and ordinary tasks split correctly',
    kind: 'happy',
    input: {
      plugins: [makePlugin('p', [
        makeTask('hook:start', { phase: 'onRunStart' }),
        makeTask('task:work'),
        makeTask('hook:end',   { phase: 'onRunEnd' }),
      ])],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=mixed] no throw');
      assert.deepStrictEqual(
        [...output!.registered].sort(),
        ['hook:end', 'hook:start', 'task:work'],
        '[cell=1, scenario=mixed] every task is name-addressable',
      );
      assert.deepStrictEqual(output!.onRunStart, ['hook:start'], '[cell=1, scenario=mixed] start hook routed');
      assert.deepStrictEqual(output!.onRunEnd,   ['hook:end'],   '[cell=1, scenario=mixed] end hook routed');
    },
  },
  {
    name: 'empty plugin (no tasks) is accepted without side effects',
    kind: 'edge',
    input: { plugins: [makePlugin('empty', [])] },
    assert(output, error) {
      assert.strictEqual(error, undefined,             '[cell=1, scenario=empty] no throw');
      assert.strictEqual(output!.registered.length, 0, '[cell=1, scenario=empty] nothing registered');
    },
  },
  {
    name: 're-adopting same plugin name warns',
    kind: 'edge',
    input: {
      plugins: [
        makePlugin('dup', [makeTask('task:x')]),
        makePlugin('dup', [makeTask('task:y')]),
      ],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=dup] no throw on re-adopt');
      assert.strictEqual(output!.warnings.length, 1, '[cell=1, scenario=dup] one warning emitted');
      assert.match(output!.warnings[0] ?? '', /dup/, '[cell=1, scenario=dup] plugin name in warning');
      assert.match(output!.warnings[0] ?? '', /already adopted/, '[cell=1, scenario=dup] explains state');
    },
  },
  {
    name: 'plugin missing required name field throws schema error',
    kind: 'unhappy',
    input: {
      plugins: [{
        'version': '0.0.1',
        tasks(): readonly TaskInterface[] { return []; },
      } as unknown as PluginInterface],
    },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=invalid-plugin] expected throw');
      assert.match((error as Error).message, /plugin invalid/, '[cell=1, scenario=invalid-plugin] message shape');
    },
  },
];

new ScenarioRunner<AdoptInput, AdoptOutput>(
  'Engine :: cell-1 :: adopt',
  (input) => {
    const engine    = new Engine();
    const warnings: string[] = [];
    const origWarn  = console.warn;
    console.warn    = (...args: unknown[]) => { warnings.push(String(args[0])); };
    try {
      for (const plugin of input.plugins) {
        engine.adopt(plugin);
      }
      const registered = engine.tasks.list().map((m) => m.name);
      const onRunStart = engine.tasks.hooks('onRunStart').map((t) => t.name);
      const onRunEnd   = engine.tasks.hooks('onRunEnd').map((t) => t.name);
      return { registered, onRunStart, onRunEnd, warnings };
    } finally {
      console.warn = origWarn;
    }
  },
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

interface PipelineInput {
  readonly tasks: readonly TaskInterface[];
  readonly order: readonly string[];
}
interface PipelineOutput {
  readonly accepted: boolean;
}

const pipelineScenarios: readonly ScenarioInterface<PipelineInput, PipelineOutput>[] = [
  {
    name: 'order with all known names accepted',
    kind: 'happy',
    input: {
      tasks: [makeTask('a'), makeTask('b')],
      order: ['a', 'b'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined,        '[cell=2, scenario=known] no throw');
      assert.strictEqual(output!.accepted, true,  '[cell=2, scenario=known] accepted');
    },
  },
  {
    name: 'requires predecessor placed before dependent accepted',
    kind: 'happy',
    input: {
      tasks: [makeTask('dep'), makeTask('consumer', { requires: ['dep'] })],
      order: ['dep', 'consumer'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=requires-ok] no throw');
      assert.strictEqual(output!.accepted, true, '[cell=2, scenario=requires-ok] accepted');
    },
  },
  {
    name: 'requires entry referring to non-registered name (math primitive) is skipped',
    kind: 'edge',
    input: {
      tasks: [makeTask('uses-math', { requires: ['someMathPrimitive'] })],
      order: ['uses-math'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=math-prim] no throw');
      assert.strictEqual(output!.accepted, true, '[cell=2, scenario=math-prim] math primitive ignored for ordering');
    },
  },
  {
    name: 'empty order accepted',
    kind: 'edge',
    input: { tasks: [], order: [] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=empty] no throw');
      assert.strictEqual(output!.accepted, true, '[cell=2, scenario=empty] empty order ok');
    },
  },
  {
    name: 'unknown name in order throws',
    kind: 'unhappy',
    input: { tasks: [], order: ['ghost'] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=unknown] expected throw');
      assert.match((error as Error).message, /ghost/,           '[cell=2, scenario=unknown] names the task');
      assert.match((error as Error).message, /not registered/,  '[cell=2, scenario=unknown] explains failure');
    },
  },
  {
    name: 'required predecessor placed after dependent throws',
    kind: 'unhappy',
    input: {
      tasks: [makeTask('dep'), makeTask('consumer', { requires: ['dep'] })],
      order: ['consumer', 'dep'],
    },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=requires-violated] expected throw');
      const msg = (error as Error).message;
      assert.match(msg, /consumer/,            '[cell=2, scenario=requires-violated] dependent named');
      assert.match(msg, /dep/,                 '[cell=2, scenario=requires-violated] dependency named');
      assert.match(msg, /must appear earlier/, '[cell=2, scenario=requires-violated] explains ordering');
    },
  },
  {
    name: 'required predecessor missing from order entirely throws',
    kind: 'unhappy',
    input: {
      tasks: [makeTask('dep'), makeTask('consumer', { requires: ['dep'] })],
      order: ['consumer'],
    },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=requires-missing] expected throw');
      const msg = (error as Error).message;
      assert.match(msg, /dep/,                       '[cell=2, scenario=requires-missing] dependency named');
      assert.match(msg, /missing from the pipeline/, '[cell=2, scenario=requires-missing] explains absence');
    },
  },
];

new ScenarioRunner<PipelineInput, PipelineOutput>(
  'Engine :: cell-2 :: pipeline',
  (input) => {
    const engine = new Engine();
    if (input.tasks.length > 0) {
      engine.adopt(makePlugin('p', input.tasks));
    }
    engine.pipeline(input.order);
    return { accepted: true };
  },
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

interface RunExecInput {
  readonly tasks: readonly { name: string; phase?: 'onRunStart' | 'onRunEnd' }[];
  readonly order: readonly string[];
}
interface RunExecOutput {
  readonly executionOrder: readonly string[];
}

const runExecScenarios: readonly ScenarioInterface<RunExecInput, RunExecOutput>[] = [
  {
    name: 'main pipeline runs in declared order',
    kind: 'happy',
    input: {
      tasks: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
      order: ['c', 'a', 'b'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=order] no throw');
      assert.deepStrictEqual(output!.executionOrder, ['c', 'a', 'b'], '[cell=3, scenario=order] declared order honoured');
    },
  },
  {
    name: 'onRunStart hook fires before main task',
    kind: 'happy',
    input: {
      tasks: [
        { name: 'hook:start', phase: 'onRunStart' },
        { name: 'task:main' },
      ],
      order: ['task:main'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=start-hook] no throw');
      assert.deepStrictEqual(
        output!.executionOrder,
        ['hook:start', 'task:main'],
        '[cell=3, scenario=start-hook] hook precedes main',
      );
    },
  },
  {
    name: 'onRunEnd hook fires after main task',
    kind: 'happy',
    input: {
      tasks: [
        { name: 'task:main' },
        { name: 'hook:end', phase: 'onRunEnd' },
      ],
      order: ['task:main'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=end-hook] no throw');
      assert.deepStrictEqual(
        output!.executionOrder,
        ['task:main', 'hook:end'],
        '[cell=3, scenario=end-hook] hook follows main',
      );
    },
  },
  {
    name: 'both hooks bracket main pipeline',
    kind: 'happy',
    input: {
      tasks: [
        { name: 'hook:start', phase: 'onRunStart' },
        { name: 'task:work' },
        { name: 'hook:end',   phase: 'onRunEnd' },
      ],
      order: ['task:work'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=bracket] no throw');
      assert.deepStrictEqual(
        output!.executionOrder,
        ['hook:start', 'task:work', 'hook:end'],
        '[cell=3, scenario=bracket] start → work → end',
      );
    },
  },
  {
    name: 'phase-marked task included in pipeline order runs only via hook',
    kind: 'edge',
    input: {
      tasks: [{ name: 'task:lifecycle', phase: 'onRunStart' }],
      order: ['task:lifecycle'],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=phase-in-order] no throw');
      assert.deepStrictEqual(
        output!.executionOrder,
        ['task:lifecycle'],
        '[cell=3, scenario=phase-in-order] fires exactly once via hook channel (main loop skips)',
      );
    },
  },
  {
    name: 'empty pipeline still completes',
    kind: 'edge',
    input: { tasks: [], order: [] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=empty] no throw');
      assert.deepStrictEqual(output!.executionOrder, [], '[cell=3, scenario=empty] no executions');
    },
  },
];

new ScenarioRunner<RunExecInput, RunExecOutput>(
  'Engine :: cell-3 :: run.execution',
  async (input) => {
    const engine = new Engine();
    const executionOrder: string[] = [];
    if (input.tasks.length > 0) {
      const tasks = input.tasks.map((t) => makeTask(t.name, {
        ...(t.phase !== undefined ? { phase: t.phase } : {}),
        onRun: () => { executionOrder.push(t.name); },
      }));
      engine.adopt(makePlugin('p', tasks));
      engine.pipeline(input.order);
    }
    await engine.run(makeInput());
    return { executionOrder };
  },
).run(runExecScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — run() input validation rejection paths
//
// `Engine.run(input)` validates input against `InputSchema` at entry. A
// malformed input MUST surface as a thrown Error naming the validation
// context.
// ---------------------------------------------------------------------------

interface RunValidationInput {
  readonly input: unknown;
}
interface RunValidationOutput {
  readonly state: PaletteStateInterface;
}

const runValidationScenarios: readonly ScenarioInterface<RunValidationInput, RunValidationOutput>[] = [
  {
    name: 'well-formed input passes validation',
    kind: 'happy',
    input: { input: makeInput({ metadata: { seed: 'green' } }) },
    assert(output, error) {
      assert.strictEqual(error, undefined,                                  '[cell=4, scenario=valid] no throw');
      assert.ok(output,                                                     '[cell=4, scenario=valid] output present');
      assert.deepStrictEqual(output!.state.metadata['seed'], 'green',       '[cell=4, scenario=valid] metadata preserved');
    },
  },
  {
    name: 'input missing colors field throws',
    kind: 'unhappy',
    input: { input: {} },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=4, scenario=missing-colors] expected throw');
      assert.match((error as Error).message, /input invalid/, '[cell=4, scenario=missing-colors] message names context');
    },
  },
  {
    name: 'input colors is non-array throws',
    kind: 'unhappy',
    input: { input: { 'colors': 'not-an-array' } },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=4, scenario=colors-non-array] expected throw');
      assert.match((error as Error).message, /input invalid/, '[cell=4, scenario=colors-non-array] message names context');
    },
  },
];

new ScenarioRunner<RunValidationInput, RunValidationOutput>(
  'Engine :: cell-4 :: run.validation',
  async (input) => {
    const engine = new Engine();
    const state  = await engine.run(input.input as InputInterface);
    return { state };
  },
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

interface StateShapeInput {
  readonly input: InputInterface;
}
interface StateShapeOutput {
  readonly state:           PaletteStateInterface;
  readonly inputIsSameRef:  boolean;
  readonly runtimeIsSameRef: boolean;
}

const stateShapeScenarios: readonly ScenarioInterface<StateShapeInput, StateShapeOutput>[] = [
  {
    name: 'empty pipeline produces baseline state shape',
    kind: 'happy',
    input: { input: makeInput() },
    assert(output, error) {
      assert.strictEqual(error, undefined,                '[cell=5, scenario=baseline] no throw');
      assert.strictEqual(output!.inputIsSameRef, true,    '[cell=5, scenario=baseline] input identity preserved');
      assert.deepStrictEqual(output!.state.colors,   [],  '[cell=5, scenario=baseline] colors default empty');
      assert.deepStrictEqual(output!.state.roles,    {},  '[cell=5, scenario=baseline] roles default empty');
      assert.deepStrictEqual(output!.state.variants, {},  '[cell=5, scenario=baseline] variants default empty');
      assert.deepStrictEqual(output!.state.outputs,  {},  '[cell=5, scenario=baseline] outputs default empty');
    },
  },
  {
    name: 'caller metadata flows into state.metadata',
    kind: 'happy',
    input: { input: makeInput({ metadata: { seed: 'violet', marker: 'tagged' } }) },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=metadata] no throw');
      assert.strictEqual(output!.state.metadata['seed'],   'violet', '[cell=5, scenario=metadata] seed preserved');
      assert.strictEqual(output!.state.metadata['marker'], 'tagged', '[cell=5, scenario=metadata] marker preserved');
    },
  },
  {
    name: 'state.runtime is a fresh object (not the same reference as input.runtime)',
    kind: 'edge',
    input: { input: makeInput({ runtime: { framing: 'dark', 'colorSpace': undefined, 'extra': undefined } }) },
    assert(output, error) {
      assert.strictEqual(error, undefined,                                  '[cell=5, scenario=runtime-clone] no throw');
      assert.deepStrictEqual(output!.state.runtime, { colorSpace: undefined, extra: undefined, framing: 'dark' }, '[cell=5, scenario=runtime-clone] values copied');
      assert.strictEqual(output!.runtimeIsSameRef, false,                   '[cell=5, scenario=runtime-clone] fresh object, not aliased');
    },
  },
];

new ScenarioRunner<StateShapeInput, StateShapeOutput>(
  'Engine :: cell-5 :: run.state-shape',
  async (input) => {
    const engine = new Engine();
    const state  = await engine.run(input.input);
    return {
      state,
      inputIsSameRef:    state.input    === input.input,
      runtimeIsSameRef:  state.runtime  === (input.input.runtime as unknown),
    };
  },
).run(stateShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — adopt invalidates cached pipeline sequence
//
// `Engine.adopt` after a `pipeline()` call must invalidate the cached
// sequence so subsequent `run()` calls resolve against the current
// registry (allowing plugin shadowing). Single-shot behavioural invariant
// — bare test rather than a table row since the side-effect is the assertion.
// ---------------------------------------------------------------------------

test('Engine :: cell-6 :: shadow :: adopt-after-pipeline rebuilds sequence on next run', async () => {
  const engine = new Engine();
  const calls: string[] = [];

  engine.adopt(makePlugin('original', [
    makeTask('task:t', { onRun: () => { calls.push('original'); } }),
  ]));
  engine.pipeline(['task:t']);

  const warnHold = console.warn;
  console.warn = () => {};
  try {
    engine.adopt(makePlugin('shadow', [
      makeTask('task:t', { onRun: () => { calls.push('shadow'); } }),
    ]));
  } finally {
    console.warn = warnHold;
  }

  await engine.run(makeInput());

  assert.deepStrictEqual(
    calls,
    ['shadow'],
    '[cell=6, scenario=shadow] post-adopt run must execute the shadowing task, not the cached original',
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

test('Engine :: cell-7 :: schema.adopt :: unhappy :: task with empty-string name in manifest rejected', () => {
  const engine = new Engine();
  const plugin: PluginInterface = {
    'name':    'bad-manifest-plugin',
    'version': '0.1.0',
    tasks(): readonly TaskInterface[] {
      return [{
        'name': 'task:bad',
        'manifest': { 'name': '', 'description': undefined, 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },   // minLength: 1 — should reject
        run() { /* no-op */ },
      }];
    },
  };
  assert.throws(
    () => engine.adopt(plugin),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok((err as Error).message.includes('manifest invalid'), `[cell=7, scenario=empty-name] got: ${(err as Error).message}`);
      return true;
    },
    '[cell=7, scenario=empty-name] adopt must throw on invalid manifest',
  );
});

test('Engine :: cell-7 :: schema.adopt :: unhappy :: plugin with malformed contributed schema rejected', () => {
  const engine = new Engine();
  const plugin: PluginInterface = {
    'name':    'bad-schema-plugin',
    'version': '0.1.0',
    tasks(): readonly TaskInterface[] { return []; },
    schemas() {
      return {
        'outputs': {
          // schema with circular ref — not ajv-compilable as standalone
          'bad': { 'type': 'INVALID_TYPE_VALUE_THAT_IS_NOT_VALID' } as Record<string, unknown>,
        }, 'metadata': undefined,
      };
    },
  };
  assert.throws(
    () => engine.adopt(plugin),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        (err as Error).message.includes('malformed') || (err as Error).message.includes('schema'),
        `[cell=7, scenario=malformed-schema] got: ${(err as Error).message}`,
      );
      return true;
    },
    '[cell=7, scenario=malformed-schema] adopt must throw on uncompilable schema',
  );
});

test('Engine :: cell-7 :: schema.adopt :: happy :: well-formed plugin with schemas() accepted', () => {
  const engine = new Engine();
  const plugin: PluginInterface = {
    'name':    'good-schema-plugin',
    'version': '0.1.0',
    tasks(): readonly TaskInterface[] { return []; },
    schemas() {
      return {
        'outputs':  { 'mySlot':  { 'type': 'object' } },
        'metadata': { 'myMeta':  { 'type': 'string' } },
      };
    },
  };
  assert.doesNotThrow(
    () => engine.adopt(plugin),
    '[cell=7, scenario=good-schemas] well-formed plugin with schemas accepted',
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

test('Engine :: cell-8 :: schema.run :: unhappy :: output failing plugin schema rejected at run exit', async () => {
  const engine = new Engine();

  const plugin: PluginInterface = {
    'name':    'output-validator-plugin',
    'version': '0.1.0',
    tasks(): readonly TaskInterface[] {
      return [{
        'name': 'task:write-bad-output',
        'manifest': { 'name': 'task:write-bad-output', 'description': undefined, 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
        run(state: PaletteStateInterface): void {
          state.outputs['mySlot'] = { 'required_string': 42 };  // number, not string
        },
      }];
    },
    schemas() {
      return {
        'outputs': {
          'mySlot': {
            'type': 'object',
            'properties': { 'required_string': { 'type': 'string' } },
            'required': ['required_string'],
          },
        }, 'metadata': undefined,
      };
    },
  };

  engine.adopt(plugin);
  engine.pipeline(['task:write-bad-output']);

  await assert.rejects(
    async () => engine.run(makeInput()),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        (err as Error).message.includes("outputs['mySlot']"),
        `[cell=8, scenario=bad-output] expected outputs slot in error, got: ${(err as Error).message}`,
      );
      return true;
    },
    '[cell=8, scenario=bad-output] run must throw when output fails plugin schema',
  );
});

test('Engine :: cell-8 :: schema.run :: unhappy :: metadata failing plugin schema rejected at run exit', async () => {
  const engine = new Engine();

  const plugin: PluginInterface = {
    'name':    'meta-validator-plugin',
    'version': '0.1.0',
    tasks(): readonly TaskInterface[] {
      return [{
        'name': 'task:write-bad-meta',
        'manifest': { 'name': 'task:write-bad-meta', 'description': undefined, 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
        run(state: PaletteStateInterface): void {
          state.metadata['myMeta'] = { 'score': 'not-a-number' };  // string, not number
        },
      }];
    },
    schemas() {
      return {
        'metadata': {
          'myMeta': {
            'type': 'object',
            'properties': { 'score': { 'type': 'number' } },
            'required': ['score'],
          },
        }, 'outputs': undefined,
      };
    },
  };

  engine.adopt(plugin);
  engine.pipeline(['task:write-bad-meta']);

  await assert.rejects(
    async () => engine.run(makeInput()),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        (err as Error).message.includes("metadata['myMeta']"),
        `[cell=8, scenario=bad-meta] expected metadata slot in error, got: ${(err as Error).message}`,
      );
      return true;
    },
    '[cell=8, scenario=bad-meta] run must throw when metadata fails plugin schema',
  );
});

test('Engine :: cell-8 :: schema.run :: happy :: conforming output and metadata pass validation', async () => {
  const engine = new Engine();

  const plugin: PluginInterface = {
    'name':    'conforming-plugin',
    'version': '0.1.0',
    tasks(): readonly TaskInterface[] {
      return [{
        'name': 'task:write-good',
        'manifest': { 'name': 'task:write-good', 'description': undefined, 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
        run(state: PaletteStateInterface): void {
          state.outputs['goodSlot']  = { 'label': 'hello' };
          state.metadata['goodMeta'] = { 'count': 42 };
        },
      }];
    },
    schemas() {
      return {
        'outputs':  { 'goodSlot':  { 'type': 'object', 'properties': { 'label': { 'type': 'string' } } } },
        'metadata': { 'goodMeta':  { 'type': 'object', 'properties': { 'count': { 'type': 'number' } } } },
      };
    },
  };

  engine.adopt(plugin);
  engine.pipeline(['task:write-good']);

  const state = await engine.run(makeInput());
  assert.deepStrictEqual(
    (state.outputs['goodSlot'] as Record<string, unknown>)['label'],
    'hello',
    '[cell=8, scenario=good] output slot accessible after valid run',
  );
});
