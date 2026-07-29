/**
 * Pipeline.integration — scenario-matrix suite.
 *
 * Subject: end-to-end pipeline state flow using stub tasks only.
 * No real intake/transform/emit implementations; depends solely on the
 * Engine / TaskRegistry foundation. Safe to run while task implementations
 * are in flux.
 *
 * Pipeline stage model:
 *   stub:intake    — writes colors from raw input into state.colors
 *   stub:transform — derives roles from colors
 *   stub:emit      — writes final output from roles
 *
 * Cells:
 *   1. state-flow    — colors, roles, outputs, metadata propagate correctly
 *   2. context       — PipelineContextInterface.engine is the same Engine instance
 *   3. edge-inputs   — empty colors, single color, many colors
 *   4. error-paths   — task that throws propagates to run() caller
 */

import type {
  EngineInterface,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  PluginInterface,
  TaskInterface
} from '@studnicky/iridis';

import { Engine } from '@studnicky/iridis/engine';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';
import type { ContextInputEntity } from './entities/ContextInputEntity.ts';
import type { ContextOutputEntity } from './entities/ContextOutputEntity.ts';
import type { EdgeInputsInputEntity } from './entities/EdgeInputsInputEntity.ts';
import type { EdgeInputsOutputEntity } from './entities/EdgeInputsOutputEntity.ts';
import type { ErrorPathInputEntity } from './entities/ErrorPathInputEntity.ts';
import type { ErrorPathOutputEntity } from './entities/ErrorPathOutputEntity.ts';
import type { StateFlowOutputEntity } from './entities/StateFlowOutputEntity.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Stub task factories — reused across cells 1 and 3.
// ---------------------------------------------------------------------------

class StubTasks {
  static intakeRun(state: PaletteStateInterface, _pipelineContext: PipelineContextInterface): void {
    for (const raw of state.input.colors) {
      const hex = typeof raw === 'string' ? raw : '#000000';
      state.colors.push({
        'alpha':        1,
        'displayP3':    undefined,
        'hex':          hex,
        'hints':        undefined,
        'oklch':        { 'c': 0.1, 'h': 0, 'l': 0.5 },
        'rgb':          { 'b': 0.502, 'g': 0.502, 'r': 0.502 },
        'sourceFormat': 'hex'
      });
    }
  }

  static transformRun(state: PaletteStateInterface, _pipelineContext: PipelineContextInterface): void {
    const first = state.colors[0];
    if (first !== undefined) { state.roles.primary = first; }
  }

  static emitRun(state: PaletteStateInterface, _pipelineContext: PipelineContextInterface): void {
    const varMap: Record<string, string> = {};
    for (const [role, record] of Object.entries(state.roles)) {
      varMap[`--color-${role}`] = record.hex;
    }
    state.outputs.stub = varMap;
  }

  static intakeTask(): TaskInterface {
    return {
      'manifest': {
        'description': undefined,
        'name':   'stub:intake',
        'phase': undefined, 'reads':  ['input.colors'], 'requires': undefined, 'writes': ['colors']
      },
      'name': 'stub:intake',
      'run': StubTasks.intakeRun
    };
  }

  static transformTask(): TaskInterface {
    return {
      'manifest': {
        'description': undefined,
        'name':   'stub:transform',
        'phase': undefined, 'reads':  ['colors'], 'requires': undefined, 'writes': ['roles']
      },
      'name': 'stub:transform',
      'run': StubTasks.transformRun
    };
  }

  static emitTask(): TaskInterface {
    return {
      'manifest': {
        'description': undefined,
        'name':   'stub:emit',
        'phase': undefined, 'reads':  ['roles'], 'requires': undefined, 'writes': ['outputs.stub']
      },
      'name': 'stub:emit',
      'run': StubTasks.emitRun
    };
  }

  static pluginTasks(): readonly TaskInterface[] {
    return [StubTasks.intakeTask(), StubTasks.transformTask(), StubTasks.emitTask()];
  }

  static plugin(): PluginInterface {
    return {
      'name':    'stub-pipeline',
      'tasks':   StubTasks.pluginTasks,
      'version': '0.0.1'
    };
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — state-flow: colors, roles, outputs, metadata propagate correctly
//
// A full stub pipeline (intake → transform → emit) must:
//   - populate state.colors with one ColorRecord per input hex
//   - derive state.roles.primary from first color
//   - write state.outputs.stub with CSS variable map
//   - pass input.metadata through to state.metadata unchanged
// ---------------------------------------------------------------------------

type StateFlowInput = {
  readonly 'colors':    string[];
  readonly 'metadata'?: Record<string, string | number>;
};

const stateFlowScenarios: readonly ScenarioInterface<StateFlowInput, StateFlowOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                         '[cell=1, scenario=single-seed] no throw');
      assert.strictEqual(output!.colorsLength,   1,                '[cell=1, scenario=single-seed] one color in state');
      assert.strictEqual(output!.firstColorHex,  '#8B5CF6',       '[cell=1, scenario=single-seed] color hex preserved');
      assert.strictEqual(output!.hasPrimary,     true,            '[cell=1, scenario=single-seed] primary role derived');
      assert.strictEqual(output!.primaryHex,     '#8B5CF6',       '[cell=1, scenario=single-seed] primary hex matches seed');
      assert.strictEqual(output!.stubVarValue,   '#8B5CF6',       '[cell=1, scenario=single-seed] stub output CSS var correct');
    },
    'input': { 'colors': ['#8B5CF6'], 'metadata': { 'source': 'integration-test' } },
    'kind': 'happy',
    'name': 'single seed flows end-to-end: colors, roles, output, metadata'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,            '[cell=1, scenario=metadata] no throw');
      assert.strictEqual(output!.metaCategory, 'music', '[cell=1, scenario=metadata] category preserved');
      assert.strictEqual(output!.metaVersion,  2,       '[cell=1, scenario=metadata] version preserved');
    },
    'input': { 'colors': ['#ffffff'], 'metadata': { 'category': 'music', 'version': 2 } },
    'kind': 'happy',
    'name': 'metadata flows through unchanged'
  }
];

new ScenarioRunner<StateFlowInput, StateFlowOutputEntity.Type>(
  'Pipeline.integration :: cell-1 :: state-flow',
  (input) => {
    const engine = new Engine();
    engine.adopt(StubTasks.plugin());
    engine.pipeline(['stub:intake', 'stub:transform', 'stub:emit']);
    const runInput: InputInterface = {
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  input.metadata,
      'roles':     undefined,
      'runtime':   undefined
    };
    const state = engine.run(runInput);
    const stub = state.outputs.stub as Record<string, string> | undefined;
    const firstColorHex = state.colors[0]?.hex ?? '';
    const stubVarValue  = stub?.['--color-primary'] ?? '';
    const metaCategory  = state.metadata.category as string | undefined;
    const metaVersion   = state.metadata.version  as number | undefined;
    return {
      'colorsLength':  state.colors.length,
      'firstColorHex': firstColorHex,
      'hasPrimary':    'primary' in state.roles,
      ...(metaCategory !== undefined ? { 'metaCategory': metaCategory } : {}),
      ...(metaVersion !== undefined ? { 'metaVersion': metaVersion } : {}),
      'primaryHex':    state.roles.primary?.hex ?? '',
      'stubVarValue':  stubVarValue
    };
  }
).run(stateFlowScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — context: PipelineContextInterface.engine is the same Engine instance
//
// Every task receives a ctx with ctx.engine referencing the same Engine that
// ran the pipeline. This must be the exact same object reference.
// ---------------------------------------------------------------------------

const contextScenarios: readonly ScenarioInterface<ContextInputEntity.Type, ContextOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error,                  undefined, '[cell=2, scenario=ctx-engine] no throw');
      assert.strictEqual(output!.engineIsExact,  true,      '[cell=2, scenario=ctx-engine] ctx.engine is same reference');
    },
    'input': {},
    'kind': 'happy',
    'name': 'ctx.engine is the same Engine instance that called run()'
  }
];

new ScenarioRunner<ContextInputEntity.Type, ContextOutputEntity.Type>(
  'Pipeline.integration :: cell-2 :: context',
  (_input) => {
    const engine = new Engine();
    let capturedEngine: EngineInterface | undefined;

    function inspectRun(_state: PaletteStateInterface, pipelineContext: PipelineContextInterface): void {
      capturedEngine = pipelineContext.engine;
    }

    const inspector: TaskInterface = {
      'manifest': { 'description': undefined, 'name': 'inspect:ctx', 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'inspect:ctx',
      'run': inspectRun
    };

    function inspectorTasks(): readonly TaskInterface[] { return [inspector]; }

    engine.adopt({
      'name': 'inspect-plugin',
      'tasks': inspectorTasks,
      'version': '0.0.1'
    });
    engine.pipeline(['inspect:ctx']);
    engine.run({ 'bypass': undefined, 'colors': [], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });

    return { 'engineIsExact': capturedEngine === engine };
  }
).run(contextScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — edge inputs: empty colors, single color, three colors with index roles
//
// Empty input must produce empty state throughout without throwing. Multiple
// colors must each get their own role when the transform maps by index.
// ---------------------------------------------------------------------------

const edgeInputsScenarios: readonly ScenarioInterface<EdgeInputsInputEntity.Type, EdgeInputsOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=3, scenario=empty] no throw');
      assert.strictEqual(output!.colorsLength, 0,       '[cell=3, scenario=empty] no colors');
      assert.strictEqual(output!.rolesCount,   0,       '[cell=3, scenario=empty] no roles');
      assert.strictEqual(output!.stubKeyCount, 0,       '[cell=3, scenario=empty] empty stub output');
    },
    'input': { 'mode': 'empty' },
    'kind': 'edge',
    'name': 'empty colors produces zero colors, zero roles, empty stub output'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error,              undefined, '[cell=3, scenario=multi-index] no throw');
      assert.strictEqual(output!.colorsLength, 3,       '[cell=3, scenario=multi-index] three colors');
      assert.strictEqual(output!.rolesCount,   3,       '[cell=3, scenario=multi-index] three roles by index');
      assert.strictEqual(output!.stubKeyCount, 3,       '[cell=3, scenario=multi-index] three CSS vars in stub output');
    },
    'input': { 'mode': 'multi-index' },
    'kind': 'happy',
    'name': 'three colors with index-based transform produce three roles'
  }
];

new ScenarioRunner<EdgeInputsInputEntity.Type, EdgeInputsOutputEntity.Type>(
  'Pipeline.integration :: cell-3 :: edge-inputs',
  (input) => {
    if (input.mode === 'empty') {
      const engine = new Engine();
      engine.adopt(StubTasks.plugin());
      engine.pipeline(['stub:intake', 'stub:transform', 'stub:emit']);
      const state = engine.run({ 'bypass': undefined, 'colors': [], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
      const stub  = state.outputs.stub as Record<string, string> | undefined;
      return {
        'colorsLength': state.colors.length,
        'rolesCount':   Object.keys(state.roles).length,
        'stubKeyCount': stub !== undefined ? Object.keys(stub).length : 0
      };
    }

    // multi-index: custom transform maps each color to a named role
    function multiTransformRun(state: PaletteStateInterface): void {
      state.colors.forEach((record, index) => { state.roles[`color-${index}`] = record; });
    }
    const multiTransform: TaskInterface = {
      'manifest': { 'description': undefined, 'name': 'stub:transform', 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'stub:transform',
      'run': multiTransformRun
    };
    function multiIndexPluginTasks(): readonly TaskInterface[] { return [StubTasks.intakeTask(), multiTransform, StubTasks.emitTask()]; }
    const plugin: PluginInterface = {
      'name':    'multi-index-plugin',
      'tasks': multiIndexPluginTasks,
      'version': '0.0.1'
    };
    const engine = new Engine();
    engine.adopt(plugin);
    engine.pipeline(['stub:intake', 'stub:transform', 'stub:emit']);
    const state = engine.run({ 'bypass': undefined, 'colors': ['#ff0000', '#00ff00', '#0000ff'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
    const stub  = state.outputs.stub as Record<string, string> | undefined;
    return {
      'colorsLength': state.colors.length,
      'rolesCount':   Object.keys(state.roles).length,
      'stubKeyCount': stub !== undefined ? Object.keys(stub).length : 0
    };
  }
).run(edgeInputsScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — error paths: task that throws propagates to run() caller
//
// An exception thrown inside a task.run() must surface as a rejected promise
// from engine.run(). The original error message must be preserved.
// ---------------------------------------------------------------------------

const errorPathScenarios: readonly ScenarioInterface<ErrorPathInputEntity.Type, ErrorPathOutputEntity.Type>[] = [
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error,                                              '[cell=4, scenario=task-throws] expected Error');
      assert.ok(
        (error).message.includes('intentional pipeline failure'),
        `[cell=4, scenario=task-throws] original message preserved; got: ${(error).message}`
      );
    },
    'input': { 'message': 'intentional pipeline failure' },
    'kind': 'unhappy',
    'name': 'task throw propagates with original message to run() caller'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=4, scenario=special-chars] expected Error');
      assert.ok(
        (error).message.includes('failure: [code=404]'),
        `[cell=4, scenario=special-chars] message preserved; got: ${(error).message}`
      );
    },
    'input': { 'message': 'failure: [code=404] "resource" not found' },
    'kind': 'unhappy',
    'name': 'task throws with nested message containing special characters'
  }
];

new ScenarioRunner<ErrorPathInputEntity.Type, ErrorPathOutputEntity.Type>(
  'Pipeline.integration :: cell-4 :: error-paths',
  (input) => {
    const engine = new Engine();
    function errorTaskRun(): void { throw new Error(input.message); }
    const errorTask: TaskInterface = {
      'manifest': { 'description': undefined, 'name': 'task:throws', 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      'name': 'task:throws',
      'run': errorTaskRun
    };
    function errorPluginTasks(): readonly TaskInterface[] { return [errorTask]; }
    engine.adopt({
      'name':    'error-plugin',
      'tasks': errorPluginTasks,
      'version': '0.0.1'
    });
    engine.pipeline(['task:throws']);
    engine.run({ 'bypass': undefined, 'colors': ['#000'], 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
    return {};
  }
).run(errorPathScenarios);
