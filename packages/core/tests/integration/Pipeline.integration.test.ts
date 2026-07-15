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
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { Engine } from '@studnicky/iridis/engine';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Stub task factories
// ---------------------------------------------------------------------------

function makeIntakeTask(): TaskInterface {
  return {
    'name': 'stub:intake',
    'manifest': {
      'name':   'stub:intake',
      'reads':  ['input.colors'],
      'writes': ['colors'], 'description': undefined, 'phase': undefined, 'requires': undefined,
    },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      for (const raw of state.input.colors) {
        const hex = typeof raw === 'string' ? raw : '#000000';
        state.colors.push({
          'oklch':        { 'l': 0.5, 'c': 0.1, 'h': 0 },
          'rgb':          { 'r': 0.502, 'g': 0.502, 'b': 0.502 },
          'hex':          hex,
          'alpha':        1,
          'sourceFormat': 'hex',
          'displayP3':    undefined,
          'hints':        undefined,
        });
      }
    },
  };
}

function makeTransformTask(): TaskInterface {
  return {
    'name': 'stub:transform',
    'manifest': {
      'name':   'stub:transform',
      'reads':  ['colors'],
      'writes': ['roles'], 'description': undefined, 'phase': undefined, 'requires': undefined,
    },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      const first = state.colors[0];
      if (first) { state.roles['primary'] = first; }
    },
  };
}

function makeEmitTask(): TaskInterface {
  return {
    'name': 'stub:emit',
    'manifest': {
      'name':   'stub:emit',
      'reads':  ['roles'],
      'writes': ['outputs.stub'], 'description': undefined, 'phase': undefined, 'requires': undefined,
    },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      const varMap: Record<string, string> = {};
      for (const [role, record] of Object.entries(state.roles)) {
        varMap[`--color-${role}`] = record.hex;
      }
      (state.outputs as Record<string, unknown>)['stub'] = varMap;
    },
  };
}

function makeStubPlugin(): PluginInterface {
  return {
    'name':    'stub-pipeline',
    'version': '0.0.1',
    tasks(): readonly TaskInterface[] {
      return [makeIntakeTask(), makeTransformTask(), makeEmitTask()];
    },
  };
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

interface StateFlowInput {
  readonly colors:    string[];
  readonly metadata?: Record<string, string | number>;
}
interface StateFlowOutput {
  readonly colorsLength:    number;
  readonly firstColorHex:   string;
  readonly hasPrimary:      boolean;
  readonly primaryHex:      string;
  readonly stubVarValue:    string;
  readonly metaCategory:    string | undefined;
  readonly metaVersion:     number | undefined;
}

const stateFlowScenarios: readonly ScenarioInterface<StateFlowInput, StateFlowOutput>[] = [
  {
    name: 'single seed flows end-to-end: colors, roles, output, metadata',
    kind: 'happy',
    input: { colors: ['#8B5CF6'], metadata: { 'source': 'integration-test' } },
    assert(output, error) {
      assert.strictEqual(error, undefined,                         '[cell=1, scenario=single-seed] no throw');
      assert.strictEqual(output!.colorsLength,   1,                '[cell=1, scenario=single-seed] one color in state');
      assert.strictEqual(output!.firstColorHex,  '#8B5CF6',       '[cell=1, scenario=single-seed] color hex preserved');
      assert.strictEqual(output!.hasPrimary,     true,            '[cell=1, scenario=single-seed] primary role derived');
      assert.strictEqual(output!.primaryHex,     '#8B5CF6',       '[cell=1, scenario=single-seed] primary hex matches seed');
      assert.strictEqual(output!.stubVarValue,   '#8B5CF6',       '[cell=1, scenario=single-seed] stub output CSS var correct');
    },
  },
  {
    name: 'metadata flows through unchanged',
    kind: 'happy',
    input: { colors: ['#ffffff'], metadata: { 'category': 'music', 'version': 2 } },
    assert(output, error) {
      assert.strictEqual(error, undefined,            '[cell=1, scenario=metadata] no throw');
      assert.strictEqual(output!.metaCategory, 'music', '[cell=1, scenario=metadata] category preserved');
      assert.strictEqual(output!.metaVersion,  2,       '[cell=1, scenario=metadata] version preserved');
    },
  },
];

new ScenarioRunner<StateFlowInput, StateFlowOutput>(
  'Pipeline.integration :: cell-1 :: state-flow',
  async (input) => {
    const engine = new Engine();
    engine.adopt(makeStubPlugin());
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
    const state = await engine.run(runInput);
    const stub = state.outputs['stub'] as Record<string, string> | undefined;
    return {
      colorsLength:  state.colors.length,
      firstColorHex: state.colors[0]?.hex ?? '',
      hasPrimary:    'primary' in state.roles,
      primaryHex:    state.roles['primary']?.hex ?? '',
      stubVarValue:  stub?.['--color-primary'] ?? '',
      metaCategory:  state.metadata['category'] as string | undefined,
      metaVersion:   state.metadata['version']  as number | undefined,
    };
  },
).run(stateFlowScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — context: PipelineContextInterface.engine is the same Engine instance
//
// Every task receives a ctx with ctx.engine referencing the same Engine that
// ran the pipeline. This must be the exact same object reference.
// ---------------------------------------------------------------------------

interface ContextInput  { readonly dummy?: undefined }
interface ContextOutput { readonly engineIsExact: boolean }

const contextScenarios: readonly ScenarioInterface<ContextInput, ContextOutput>[] = [
  {
    name: 'ctx.engine is the same Engine instance that called run()',
    kind: 'happy',
    input: {},
    assert(output, error) {
      assert.strictEqual(error,                  undefined, '[cell=2, scenario=ctx-engine] no throw');
      assert.strictEqual(output!.engineIsExact,  true,      '[cell=2, scenario=ctx-engine] ctx.engine is same reference');
    },
  },
];

new ScenarioRunner<ContextInput, ContextOutput>(
  'Pipeline.integration :: cell-2 :: context',
  async (_input) => {
    const engine = new Engine();
    let capturedEngine: unknown;

    const inspector: TaskInterface = {
      'name': 'inspect:ctx',
      'manifest': { 'name': 'inspect:ctx', 'description': undefined, 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      run(_state: PaletteStateInterface, ctx: PipelineContextInterface): void {
        capturedEngine = ctx.engine;
      },
    };

    engine.adopt({
      'name': 'inspect-plugin',
      'version': '0.0.1',
      tasks(): readonly TaskInterface[] { return [inspector]; },
    });
    engine.pipeline(['inspect:ctx']);
    await engine.run({ 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });

    return { engineIsExact: capturedEngine === engine };
  },
).run(contextScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — edge inputs: empty colors, single color, three colors with index roles
//
// Empty input must produce empty state throughout without throwing. Multiple
// colors must each get their own role when the transform maps by index.
// ---------------------------------------------------------------------------

interface EdgeInputsInput {
  readonly mode: 'empty' | 'single' | 'multi-index';
}
interface EdgeInputsOutput {
  readonly colorsLength: number;
  readonly rolesCount:   number;
  readonly stubKeyCount: number;
}

const edgeInputsScenarios: readonly ScenarioInterface<EdgeInputsInput, EdgeInputsOutput>[] = [
  {
    name: 'empty colors produces zero colors, zero roles, empty stub output',
    kind: 'edge',
    input: { mode: 'empty' },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=3, scenario=empty] no throw');
      assert.strictEqual(output!.colorsLength, 0,       '[cell=3, scenario=empty] no colors');
      assert.strictEqual(output!.rolesCount,   0,       '[cell=3, scenario=empty] no roles');
      assert.strictEqual(output!.stubKeyCount, 0,       '[cell=3, scenario=empty] empty stub output');
    },
  },
  {
    name: 'three colors with index-based transform produce three roles',
    kind: 'happy',
    input: { mode: 'multi-index' },
    assert(output, error) {
      assert.strictEqual(error,              undefined, '[cell=3, scenario=multi-index] no throw');
      assert.strictEqual(output!.colorsLength, 3,       '[cell=3, scenario=multi-index] three colors');
      assert.strictEqual(output!.rolesCount,   3,       '[cell=3, scenario=multi-index] three roles by index');
      assert.strictEqual(output!.stubKeyCount, 3,       '[cell=3, scenario=multi-index] three CSS vars in stub output');
    },
  },
];

new ScenarioRunner<EdgeInputsInput, EdgeInputsOutput>(
  'Pipeline.integration :: cell-3 :: edge-inputs',
  async (input) => {
    if (input.mode === 'empty') {
      const engine = new Engine();
      engine.adopt(makeStubPlugin());
      engine.pipeline(['stub:intake', 'stub:transform', 'stub:emit']);
      const state = await engine.run({ 'colors': [], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
      const stub  = state.outputs['stub'] as Record<string, string> | undefined;
      return {
        colorsLength: state.colors.length,
        rolesCount:   Object.keys(state.roles).length,
        stubKeyCount: stub ? Object.keys(stub).length : 0,
      };
    }

    // multi-index: custom transform maps each color to a named role
    const multiTransform: TaskInterface = {
      'name': 'stub:transform',
      'manifest': { 'name': 'stub:transform', 'description': undefined, 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      run(state: PaletteStateInterface): void {
        state.colors.forEach((record, i) => { state.roles[`color-${i}`] = record; });
      },
    };
    const plugin: PluginInterface = {
      'name':    'multi-index-plugin',
      'version': '0.0.1',
      tasks(): readonly TaskInterface[] { return [makeIntakeTask(), multiTransform, makeEmitTask()]; },
    };
    const engine = new Engine();
    engine.adopt(plugin);
    engine.pipeline(['stub:intake', 'stub:transform', 'stub:emit']);
    const state = await engine.run({ 'colors': ['#ff0000', '#00ff00', '#0000ff'], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
    const stub  = state.outputs['stub'] as Record<string, string> | undefined;
    return {
      colorsLength: state.colors.length,
      rolesCount:   Object.keys(state.roles).length,
      stubKeyCount: stub ? Object.keys(stub).length : 0,
    };
  },
).run(edgeInputsScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — error paths: task that throws propagates to run() caller
//
// An exception thrown inside a task.run() must surface as a rejected promise
// from engine.run(). The original error message must be preserved.
// ---------------------------------------------------------------------------

interface ErrorPathInput  { readonly message: string }
interface ErrorPathOutput { readonly dummy: undefined }

const errorPathScenarios: readonly ScenarioInterface<ErrorPathInput, ErrorPathOutput>[] = [
  {
    name: 'task throw propagates with original message to run() caller',
    kind: 'unhappy',
    input: { message: 'intentional pipeline failure' },
    assert(_output, error) {
      assert.ok(error instanceof Error,                                              '[cell=4, scenario=task-throws] expected Error');
      assert.ok(
        (error as Error).message.includes('intentional pipeline failure'),
        `[cell=4, scenario=task-throws] original message preserved; got: ${(error as Error).message}`,
      );
    },
  },
  {
    name: 'task throws with nested message containing special characters',
    kind: 'unhappy',
    input: { message: 'failure: [code=404] "resource" not found' },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=4, scenario=special-chars] expected Error');
      assert.ok(
        (error as Error).message.includes('failure: [code=404]'),
        `[cell=4, scenario=special-chars] message preserved; got: ${(error as Error).message}`,
      );
    },
  },
];

new ScenarioRunner<ErrorPathInput, ErrorPathOutput>(
  'Pipeline.integration :: cell-4 :: error-paths',
  async (input) => {
    const engine = new Engine();
    const errorTask: TaskInterface = {
      'name': 'task:throws',
      'manifest': { 'name': 'task:throws', 'description': undefined, 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined },
      run(): void { throw new Error(input.message); },
    };
    engine.adopt({
      'name':    'error-plugin',
      'version': '0.0.1',
      tasks(): readonly TaskInterface[] { return [errorTask]; },
    });
    engine.pipeline(['task:throws']);
    await engine.run({ 'colors': ['#000'], 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined });
    return { dummy: undefined };
  },
).run(errorPathScenarios);
