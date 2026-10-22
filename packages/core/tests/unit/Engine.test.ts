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

import type { JSONSchema7Type } from 'json-schema';

import { JsonObject } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { test }   from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';
import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';
import type { PluginInterface } from '../../src/interfaces/PluginInterface.ts';
import type { TaskInterface } from '../../src/interfaces/TaskInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { Engine } from '../../src/engine/Engine.ts';
import { InputEntity } from '../../src/entities/InputEntity.ts';
import { RuntimeOptionsEntity } from '../../src/entities/RuntimeOptionsEntity.ts';
import { TaskManifestEntity } from '../../src/entities/TaskManifestEntity.ts';
import { ENGINE_TEST_PATTERNS } from './engine/constants/EngineTestPatterns.ts';
import { EngineTestFixture } from './engine/EngineTestFixture.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class EngineSchemaErrorAssertions {
  static isMalformedSchema(error: Error): boolean {
    const message = error.message;
    const result = message.includes('malformed') || message.includes('schema');
    return result;
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
interface AdoptOutputInterface {
  readonly 'onRunEnd':      readonly string[];
  readonly 'onRunStart':    readonly string[];
  readonly 'registered':    readonly string[];
  readonly 'warnings':      readonly string[];
};

class EngineAdoptScenarioMatrix {
  static runAdopt(): void {
    const adoptScenarios: readonly ScenarioInterface<AdoptInputInterface, AdoptOutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=single-task] no throw');
          assert.deepStrictEqual(output!.registered, ['task:a'], '[cell=1, scenario=single-task] registered list');
          assert.strictEqual(output!.onRunStart.length, 0, '[cell=1, scenario=single-task] no hooks');
          assert.strictEqual(output!.onRunEnd.length,   0, '[cell=1, scenario=single-task] no hooks');
        },
        'input': { 'plugins': [EngineTestFixture.makePlugin('p', [EngineTestFixture.makeTask('task:a')])] },
        'kind': 'happy',
        'name': 'single plugin with one task registers it'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=multi-plugin] no throw');
          assert.deepStrictEqual(
            [...output!.registered].sort((left, right) => { const result = left.localeCompare(right); return result; }),
            ['task:a', 'task:b'],
            '[cell=1, scenario=multi-plugin] both tasks registered'
          );
        },
        'input': {
          'plugins': [
            EngineTestFixture.makePlugin('a', [EngineTestFixture.makeTask('task:a')]),
            EngineTestFixture.makePlugin('b', [EngineTestFixture.makeTask('task:b')])
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
          'plugins': [EngineTestFixture.makePlugin('p', [EngineTestFixture.makeRunStartTask('hook:start')])]
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
          'plugins': [EngineTestFixture.makePlugin('p', [EngineTestFixture.makeRunEndTask('hook:end')])]
        },
        'kind': 'happy',
        'name': 'onRunEnd task routes through hook channel'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=mixed] no throw');
          assert.deepStrictEqual(
            [...output!.registered].sort((left, right) => { const result = left.localeCompare(right); return result; }),
            ['hook:end', 'hook:start', 'task:work'],
            '[cell=1, scenario=mixed] every task is name-addressable'
          );
          assert.deepStrictEqual(output!.onRunStart, ['hook:start'], '[cell=1, scenario=mixed] start hook routed');
          assert.deepStrictEqual(output!.onRunEnd,   ['hook:end'],   '[cell=1, scenario=mixed] end hook routed');
        },
        'input': {
          'plugins': [EngineTestFixture.makePlugin('p', [
            EngineTestFixture.makeRunStartTask('hook:start'),
            EngineTestFixture.makeTask('task:work'),
            EngineTestFixture.makeRunEndTask('hook:end')
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
        'input': { 'plugins': [EngineTestFixture.makePlugin('empty', [])] },
        'kind': 'edge',
        'name': 'empty plugin (no tasks) is accepted without side effects'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=1, scenario=dup] no throw on re-adopt');
          assert.strictEqual(output!.warnings.length, 1, '[cell=1, scenario=dup] one warning emitted');
          assert.match(output!.warnings.at(0) ?? '', ENGINE_TEST_PATTERNS.duplicate, '[cell=1, scenario=dup] plugin name in warning');
          assert.match(output!.warnings.at(0) ?? '', ENGINE_TEST_PATTERNS.alreadyAdopted, '[cell=1, scenario=dup] explains state');
        },
        'input': {
          'plugins': [
            EngineTestFixture.makePlugin('dup', [EngineTestFixture.makeTask('task:x')]),
            EngineTestFixture.makePlugin('dup', [EngineTestFixture.makeTask('task:y')])
          ]
        },
        'kind': 'edge',
        'name': 're-adopting same plugin name warns'
      },
      {
        'assert': function(_output, error) {
          assert.ok(error instanceof Error, '[cell=1, scenario=invalid-plugin] expected throw');
          assert.match((error).message, ENGINE_TEST_PATTERNS.pluginInvalid, '[cell=1, scenario=invalid-plugin] message shape');
        },
        'input': {
          'plugins': [{
            'name': '',
            'tasks': function(): readonly TaskInterface[] { return []; },
            'version': '0.0.1'
          }]
        },
        'kind': 'unhappy',
        'name': 'plugin with an empty name field throws schema error'
      }
    ];

    new ScenarioRunner<AdoptInputInterface, AdoptOutputInterface>(
      'Engine :: cell-1 :: adopt',
      (input) => {
        const engine   = new Engine();
        const warningCapture = EngineTestFixture.captureWarnings();
        try {
          for (let pluginIndex = 0; pluginIndex < input.plugins.length; pluginIndex += 1) {
            const plugin = input.plugins[pluginIndex];
            if (plugin !== undefined) {
              engine.adopt(plugin);
            }
          }
          const registered = engine.tasks.list().map((m) => { const result = m.name; return result; });
          const onRunStart = engine.tasks.onRunStartTasks().map((t) => { const result = t.name; return result; });
          const onRunEnd   = engine.tasks.onRunEndTasks().map((t) => { const result = t.name; return result; });
          return { 'onRunEnd': onRunEnd, 'onRunStart': onRunStart, 'registered': registered, 'warnings': warningCapture.warnings };
        } finally {
          warningCapture.restore();
        }
      }
    ).run(adoptScenarios);
  }
}

// ---------------------------------------------------------------------------
void test('Engine :: adopt :: callable plugin members do not enter JSON schema validation', () => {
  const engine = new Engine();
  const plugin = EngineTestFixture.makePluginWithEmptySchemas('callable-plugin');

  assert.doesNotThrow(
    () => { engine.adopt(plugin); },
    '[adopt-callable-plugin] plugin task and schema factories are admitted'
  );
});

void test('Engine :: adopt :: class plugin instance is admitted through the plugin boundary', () => {
  class ClassPlugin implements PluginInterface {
    readonly 'name' = 'class-plugin';
    readonly 'version' = '1.0.0';

    tasks(): readonly TaskInterface[] {
      return [EngineTestFixture.makeTask('class:task')];
    }
  }

  const engine = new Engine();
  engine.adopt(new ClassPlugin());

  const names = engine.tasks.list().map((manifest) => { return manifest.name; });
  assert.deepStrictEqual(names, ['class:task'], '[adopt-class-plugin] prototype task factory is admitted and registered');
});

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

class EnginePipelineScenarioMatrix {
  static runPipeline(): void {
    const pipelineScenarios: readonly ScenarioInterface<PipelineInputInterface, void>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined,        '[cell=2, scenario=known] no throw');
          assert.strictEqual(output, undefined, '[cell=2, scenario=known] accepted');
        },
        'input': {
          'order': ['a', 'b'],
          'tasks': [EngineTestFixture.makeTask('a'), EngineTestFixture.makeTask('b')]
        },
        'kind': 'happy',
        'name': 'order with all known names accepted'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=requires-ok] no throw');
          assert.strictEqual(output, undefined, '[cell=2, scenario=requires-ok] accepted');
        },
        'input': {
          'order': ['dep', 'consumer'],
          'tasks': [EngineTestFixture.makeTask('dep'), EngineTestFixture.makeTask('consumer', { 'requires': ['dep'] })]
        },
        'kind': 'happy',
        'name': 'requires predecessor placed before dependent accepted'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=math-prim] no throw');
          assert.strictEqual(output, undefined, '[cell=2, scenario=math-prim] math primitive ignored for ordering');
        },
        'input': {
          'order': ['uses-math'],
          'tasks': [EngineTestFixture.makeTask('uses-math', { 'requires': ['someMathPrimitive'] })]
        },
        'kind': 'edge',
        'name': 'requires entry referring to non-registered name (math primitive) is skipped'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=2, scenario=empty] no throw');
          assert.strictEqual(output, undefined, '[cell=2, scenario=empty] empty order ok');
        },
        'input': { 'order': [], 'tasks': [] },
        'kind': 'edge',
        'name': 'empty order accepted'
      },
      {
        'assert': function(_output, error) {
          assert.ok(error instanceof Error, '[cell=2, scenario=unknown] expected throw');
          assert.match((error).message, ENGINE_TEST_PATTERNS.unknownTask,           '[cell=2, scenario=unknown] names the task');
          assert.match((error).message, ENGINE_TEST_PATTERNS.taskNotRegistered,  '[cell=2, scenario=unknown] explains failure');
        },
        'input': { 'order': ['ghost'], 'tasks': [] },
        'kind': 'unhappy',
        'name': 'unknown name in order throws'
      },
      {
        'assert': function(_output, error) {
          assert.ok(error instanceof Error, '[cell=2, scenario=requires-violated] expected throw');
          const message = (error).message;
          assert.match(message, ENGINE_TEST_PATTERNS.consumer,            '[cell=2, scenario=requires-violated] dependent named');
          assert.match(message, ENGINE_TEST_PATTERNS.dependency,                 '[cell=2, scenario=requires-violated] dependency named');
          assert.match(message, ENGINE_TEST_PATTERNS.mustAppearEarlier, '[cell=2, scenario=requires-violated] explains ordering');
        },
        'input': {
          'order': ['consumer', 'dep'],
          'tasks': [EngineTestFixture.makeTask('dep'), EngineTestFixture.makeTask('consumer', { 'requires': ['dep'] })]
        },
        'kind': 'unhappy',
        'name': 'required predecessor placed after dependent throws'
      },
      {
        'assert': function(_output, error) {
          assert.ok(error instanceof Error, '[cell=2, scenario=requires-missing] expected throw');
          const message = (error).message;
          assert.match(message, ENGINE_TEST_PATTERNS.dependency,                       '[cell=2, scenario=requires-missing] dependency named');
          assert.match(message, ENGINE_TEST_PATTERNS.pipelineMissing, '[cell=2, scenario=requires-missing] explains absence');
        },
        'input': {
          'order': ['consumer'],
          'tasks': [EngineTestFixture.makeTask('dep'), EngineTestFixture.makeTask('consumer', { 'requires': ['dep'] })]
        },
        'kind': 'unhappy',
        'name': 'required predecessor missing from order entirely throws'
      }
    ];

    new ScenarioRunner<PipelineInputInterface, void>(
      'Engine :: cell-2 :: pipeline',
      (input) => {
        const engine = new Engine();
        if (input.tasks.length > 0) {
          engine.adopt(EngineTestFixture.makePlugin('p', input.tasks));
        }
        engine.pipeline(input.order);
        return undefined;
      }
    ).run(pipelineScenarios);
  }
}

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

interface RunExecInputInterface {
  readonly 'onRunEndTaskNames': readonly string[];
  readonly 'onRunStartTaskNames': readonly string[];
  readonly 'order': readonly string[];
  readonly 'taskNames': readonly string[];
};
interface RunExecOutputInterface {
  readonly 'executionOrder': readonly string[];
};

class EngineExecutionScenarioMatrix {
  private static taskFor(
    taskName: string,
    onRunStartTaskNames: ReadonlySet<string>,
    onRunEndTaskNames: ReadonlySet<string>,
    executionOrder: string[]
  ): TaskInterface {
    const onRun = (): void => { executionOrder.push(taskName); };
    if (onRunStartTaskNames.has(taskName)) {
      const result = EngineTestFixture.makeRunStartTask(taskName, onRun);
      return result;
    }
    if (onRunEndTaskNames.has(taskName)) {
      const result = EngineTestFixture.makeRunEndTask(taskName, onRun);
      return result;
    }
    const result = EngineTestFixture.makeTask(taskName, { 'onRun': onRun });
    return result;
  }

  static runExecution(): void {
    const runExecScenarios: readonly ScenarioInterface<RunExecInputInterface, RunExecOutputInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=3, scenario=order] no throw');
          assert.deepStrictEqual(output!.executionOrder, ['c', 'a', 'b'], '[cell=3, scenario=order] declared order honoured');
        },
        'input': {
          'onRunEndTaskNames': [],
          'onRunStartTaskNames': [],
          'order': ['c', 'a', 'b'],
          'taskNames': ['a', 'b', 'c']
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
          'onRunEndTaskNames': [],
          'onRunStartTaskNames': ['hook:start'],
          'order': ['task:main'],
          'taskNames': ['hook:start', 'task:main']
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
          'onRunEndTaskNames': ['hook:end'],
          'onRunStartTaskNames': [],
          'order': ['task:main'],
          'taskNames': ['task:main', 'hook:end']
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
          'onRunEndTaskNames': ['hook:end'],
          'onRunStartTaskNames': ['hook:start'],
          'order': ['task:work'],
          'taskNames': ['hook:start', 'task:work', 'hook:end']
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
          'onRunEndTaskNames': [],
          'onRunStartTaskNames': ['task:lifecycle'],
          'order': ['task:lifecycle'],
          'taskNames': ['task:lifecycle']
        },
        'kind': 'edge',
        'name': 'phase-marked task included in pipeline order runs only via hook'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=3, scenario=empty] no throw');
          assert.deepStrictEqual(output!.executionOrder, [], '[cell=3, scenario=empty] no executions');
        },
        'input': { 'onRunEndTaskNames': [], 'onRunStartTaskNames': [], 'order': [], 'taskNames': [] },
        'kind': 'edge',
        'name': 'empty pipeline still completes'
      }
    ];

    new ScenarioRunner<RunExecInputInterface, RunExecOutputInterface>(
      'Engine :: cell-3 :: run.execution',
      (input) => {
        const engine = new Engine();
        const executionOrder: string[] = [];
        if (input.taskNames.length > 0) {
          const onRunStartTaskNames = new Set(input.onRunStartTaskNames);
          const onRunEndTaskNames = new Set(input.onRunEndTaskNames);
          const tasks = input.taskNames.map((taskName) => {
            const result = EngineExecutionScenarioMatrix.taskFor(taskName, onRunStartTaskNames, onRunEndTaskNames, executionOrder);
            return result;
          });
          engine.adopt(EngineTestFixture.makePlugin('p', tasks));
          engine.pipeline(input.order);
        }
        engine.run(EngineTestFixture.makeInput());
        return { 'executionOrder': executionOrder };
      }
    ).run(runExecScenarios);
  }
}

// ---------------------------------------------------------------------------
// Cell 4 — run() input validation rejection paths
//
// `Engine.run(input)` validates input against `InputSchema` at entry. A
// malformed input MUST surface as a thrown Error naming the validation
// context.
// ---------------------------------------------------------------------------

void test('Engine :: cell-4 :: canonical input runs to a state', () => {
  const engine = new Engine();
  const state = engine.run(EngineTestFixture.makeInput({ 'metadata': { 'seed': 'green' } }));

  assert.ok(JsonObject.is(state.metadata), '[cell=4, scenario=valid] state metadata is an object');
  assert.deepStrictEqual(state.metadata.seed, 'green', '[cell=4, scenario=valid] metadata preserved');
});

void test('Engine :: cell-4 :: input entity admits valid external JSON', () => {
  const input = InputEntity.intake({ 'colors': ['#ff0000'], 'metadata': { 'seed': 'green' } });
  const state = new Engine().run(input);
  assert.deepStrictEqual(input.colors, ['#ff0000'], '[cell=4, scenario=input-entity] colors are preserved');
  assert.strictEqual(state.input, input, '[cell=4, scenario=input-entity] admitted input runs through the engine without a compatibility conversion');
});

void test('Engine :: cell-4 :: missing colors is rejected at the input entity boundary', () => {
  assert.throws(
    () => { InputEntity.intake({}); },
    function(error: Error): boolean {
      const includesColors = error.message.includes('colors');
      return includesColors;
    },
    '[cell=4, scenario=missing-colors] entity boundary rejects malformed input'
  );
});

void test('Engine :: cell-4 :: non-array colors is rejected at the input entity boundary', () => {
  assert.throws(
    () => { InputEntity.intake({ 'colors': 'not-an-array' }); },
    function(error: Error): boolean {
      const includesColors = error.message.includes('colors');
      return includesColors;
    },
    '[cell=4, scenario=colors-non-array] entity boundary rejects malformed input'
  );
});

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
  readonly 'input': InputEntity.Type;
}
class EngineStateShapeScenarioMatrix {
  static runStateShape(): void {
    const stateShapeScenarios: readonly ScenarioInterface<StateShapeInputInterface, PaletteStateInterface>[] = [
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined,                '[cell=5, scenario=baseline] no throw');
          assert.deepStrictEqual(output!.colors,   [],  '[cell=5, scenario=baseline] colors default empty');
          assert.deepStrictEqual(output!.roles,    {},  '[cell=5, scenario=baseline] roles default empty');
          assert.deepStrictEqual(output!.variants, {},  '[cell=5, scenario=baseline] variants default empty');
          assert.deepStrictEqual(output!.outputs,  {},  '[cell=5, scenario=baseline] outputs default empty');
        },
        'input': { 'input': EngineTestFixture.makeInput() },
        'kind': 'happy',
        'name': 'empty pipeline produces baseline state shape'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined, '[cell=5, scenario=metadata] no throw');
          assert.strictEqual(output!.metadata.seed,   'violet', '[cell=5, scenario=metadata] seed preserved');
          assert.strictEqual(output!.metadata.marker, 'tagged', '[cell=5, scenario=metadata] marker preserved');
        },
        'input': { 'input': EngineTestFixture.makeInput({ 'metadata': { 'marker': 'tagged', 'seed': 'violet' } }) },
        'kind': 'happy',
        'name': 'caller metadata flows into state.metadata'
      },
      {
        'assert': function(output, error) {
          assert.strictEqual(error, undefined,                                  '[cell=5, scenario=runtime-clone] no throw');
          assert.deepStrictEqual(output!.runtime, { 'framing': 'dark' }, '[cell=5, scenario=runtime-clone] values copied');
        },
        'input': { 'input': EngineTestFixture.makeInput({ 'runtime': RuntimeOptionsEntity.intake({ 'framing': 'dark' }) }) },
        'kind': 'edge',
        'name': 'state.runtime is a fresh object (not the same reference as input.runtime)'
      }
    ];

    new ScenarioRunner<StateShapeInputInterface, PaletteStateInterface>(
      'Engine :: cell-5 :: run.state-shape',
      (input) => {
        const engine = new Engine();
        const state  = engine.run(input.input);
        assert.strictEqual(state.input, input.input, '[cell=5] input identity preserved');
        assert.notStrictEqual(state.runtime, input.input.runtime, '[cell=5] runtime is not aliased');
        return state;
      }
    ).run(stateShapeScenarios);
  }
}

EngineAdoptScenarioMatrix.runAdopt();
EnginePipelineScenarioMatrix.runPipeline();
EngineExecutionScenarioMatrix.runExecution();
EngineStateShapeScenarioMatrix.runStateShape();

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
  engine.adopt(EngineTestFixture.makePlugin('original', [
    EngineTestFixture.makeTask('task:t', { 'onRun': onRunOriginal })
  ]));
  engine.pipeline(['task:t']);

  const warningCapture = EngineTestFixture.captureWarnings();
  try {
    const onRunShadow = (): void => { calls.push('shadow'); };
    engine.adopt(EngineTestFixture.makePlugin('shadow', [
      EngineTestFixture.makeTask('task:t', { 'onRun': onRunShadow })
    ]));
  } finally {
    warningCapture.restore();
  }

  engine.run(EngineTestFixture.makeInput());

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
      'manifest': TaskManifestEntity.create({ 'name': '' }),   // minLength: 1 — should reject
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
  const malformedSchemas: readonly JSONSchema7Type[] = [
    EngineTestFixture.malformedSchemaType('INVALID_TYPE_VALUE_THAT_IS_NOT_VALID'),
    EngineTestFixture.malformedSchemaType(42),
    EngineTestFixture.malformedSchemaType({}),
    EngineTestFixture.malformedSchemaType(null),
    EngineTestFixture.malformedSchemaType([]),
    EngineTestFixture.malformedSchemaType(['string', 'string']),
    EngineTestFixture.malformedSchemaType(['string', 'INVALID_TYPE_VALUE_THAT_IS_NOT_VALID']),
    {
      '$defs': { 'nested': EngineTestFixture.malformedSchemaType(42) },
      'type': 'object'
    }
  ];

  for (let index = 0; index < malformedSchemas.length; index += 1) {
    const malformedSchema = malformedSchemas[index];
    if (malformedSchema === undefined) {
      continue;
    }
    const engine = new Engine();
    const schemas = (): ReturnType<Exclude<PluginInterface['schemas'], undefined>> => {
      return { 'outputs': { 'bad': malformedSchema } };
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
      EngineSchemaErrorAssertions.isMalformedSchema,
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
      'outputs': {
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
      'manifest': TaskManifestEntity.create({ 'name': 'task:write-bad-output' }),
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
    () => { engine.run(EngineTestFixture.makeInput()); },
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
      }
    };
  };
  const tasks = (): readonly TaskInterface[] => {
    return [{
      'manifest': TaskManifestEntity.create({ 'name': 'task:write-bad-meta' }),
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
    () => { engine.run(EngineTestFixture.makeInput()); },
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
      'manifest': TaskManifestEntity.create({ 'name': 'task:write-good' }),
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

  const state = engine.run(EngineTestFixture.makeInput());
  const goodSlot = state.outputs.goodSlot;
  assert.ok(JsonObject.is(goodSlot), '[cell=8, scenario=good] output slot is an object');
  assert.deepStrictEqual(
    goodSlot.label,
    'hello',
    '[cell=8, scenario=good] output slot accessible after valid run'
  );
});
