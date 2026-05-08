import type {
  InputInterface,
  MathPrimitiveInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  PluginInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { Engine } from '@studnicky/iridis/engine';
import { assert } from './ScenarioRunner.ts';
import { test } from 'node:test';

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

function makeTask(name: string, marker?: string): TaskInterface & { 'calls': string[] } {
  const calls: string[] = [];
  const manifest: TaskManifestInterface = { 'name': name };
  return {
    'name': name,
    'manifest': manifest,
    'calls': calls,
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      calls.push(marker ?? name);
      (state.metadata as Record<string, unknown>)[name] = true;
    },
  };
}

function makePlugin(name: string, tasks: TaskInterface[], prims: MathPrimitiveInterface[] = []): PluginInterface {
  return {
    'name': name,
    'version': '0.0.1',
    tasks(): readonly TaskInterface[] { return tasks; },
    math(): readonly MathPrimitiveInterface[] { return prims; },
  };
}

function makeInput(extra: Partial<InputInterface> = {}): InputInterface {
  return {
    'colors': ['#ff0000'],
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// adopt
// ---------------------------------------------------------------------------

test('Engine :: happy :: adopt registers plugin tasks', () => {
  const engine = new Engine();
  const task = makeTask('stub:task');
  const plugin = makePlugin('stub-plugin', [task]);
  engine.adopt(plugin);
  assert.strictEqual(engine.tasks.has('stub:task'), true);
});

test('Engine :: happy :: adopt registers plugin math primitives', () => {
  const engine = new Engine();
  const prim: MathPrimitiveInterface = { 'name': 'prim:double', apply: (x: unknown) => (x as number) * 2 };
  const plugin = makePlugin('prim-plugin', [], [prim]);
  engine.adopt(plugin);
  assert.strictEqual(engine.math.has('prim:double'), true);
  assert.strictEqual(engine.math.invoke<number>('prim:double', 5), 10);
});

test('Engine :: happy :: adopt multiple plugins accumulates all tasks', () => {
  const engine = new Engine();
  const taskA = makeTask('task:a');
  const taskB = makeTask('task:b');
  engine.adopt(makePlugin('plugin-a', [taskA]));
  engine.adopt(makePlugin('plugin-b', [taskB]));
  assert.strictEqual(engine.tasks.has('task:a'), true);
  assert.strictEqual(engine.tasks.has('task:b'), true);
});

// ---------------------------------------------------------------------------
// pipeline
// ---------------------------------------------------------------------------

test('Engine :: happy :: pipeline sets execution order', () => {
  const engine = new Engine();
  const taskA = makeTask('task:a');
  const taskB = makeTask('task:b');
  engine.adopt(makePlugin('p', [taskA, taskB]));
  // should not throw
  engine.pipeline(['task:a', 'task:b']);
});

test('Engine :: unhappy :: pipeline references unknown task name throws', () => {
  const engine = new Engine();
  assert.throws(
    () => engine.pipeline(['does:not:exist']),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("task 'does:not:exist' is not registered"));
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// run — happy path
// ---------------------------------------------------------------------------

test('Engine :: happy :: run returns PaletteStateInterface with input preserved', async () => {
  const engine = new Engine();
  const input = makeInput({ 'metadata': { 'seed': 'test' } });
  const state = await engine.run(input);
  assert.strictEqual(state.input, input);
  assert.deepStrictEqual(state.metadata['seed'], 'test');
});

test('Engine :: happy :: run executes tasks in pipeline order', async () => {
  const engine = new Engine();
  const executionOrder: string[] = [];

  const taskA: TaskInterface = {
    'name': 'task:a',
    'manifest': { 'name': 'task:a' },
    run(_state, _ctx) { executionOrder.push('a'); },
  };
  const taskB: TaskInterface = {
    'name': 'task:b',
    'manifest': { 'name': 'task:b' },
    run(_state, _ctx) { executionOrder.push('b'); },
  };
  const taskC: TaskInterface = {
    'name': 'task:c',
    'manifest': { 'name': 'task:c' },
    run(_state, _ctx) { executionOrder.push('c'); },
  };

  engine.adopt(makePlugin('p', [taskA, taskB, taskC]));
  // set order: c → a → b
  engine.pipeline(['task:c', 'task:a', 'task:b']);
  await engine.run(makeInput());
  assert.deepStrictEqual(executionOrder, ['c', 'a', 'b']);
});

test('Engine :: happy :: run executes onRunStart hooks before pipeline tasks', async () => {
  const engine = new Engine();
  const executionOrder: string[] = [];

  const hookTask: TaskInterface = {
    'name': 'hook:start',
    'manifest': { 'name': 'hook:start', 'phase': 'onRunStart' },
    run(_state, _ctx) { executionOrder.push('hook'); },
  };
  const pipelineTask: TaskInterface = {
    'name': 'task:main',
    'manifest': { 'name': 'task:main' },
    run(_state, _ctx) { executionOrder.push('main'); },
  };

  engine.tasks.hook('onRunStart', hookTask);
  engine.adopt(makePlugin('p', [pipelineTask]));
  engine.pipeline(['task:main']);
  await engine.run(makeInput());

  assert.strictEqual(executionOrder[0], 'hook');
  assert.strictEqual(executionOrder[1], 'main');
});

test('Engine :: happy :: run executes onRunEnd hooks after pipeline tasks', async () => {
  const engine = new Engine();
  const executionOrder: string[] = [];

  const endHook: TaskInterface = {
    'name': 'hook:end',
    'manifest': { 'name': 'hook:end', 'phase': 'onRunEnd' },
    run(_state, _ctx) { executionOrder.push('end'); },
  };
  const pipelineTask: TaskInterface = {
    'name': 'task:main',
    'manifest': { 'name': 'task:main' },
    run(_state, _ctx) { executionOrder.push('main'); },
  };

  engine.tasks.hook('onRunEnd', endHook);
  engine.adopt(makePlugin('p', [pipelineTask]));
  engine.pipeline(['task:main']);
  await engine.run(makeInput());

  assert.deepStrictEqual(executionOrder, ['main', 'end']);
});

// ---------------------------------------------------------------------------
// run — edge
// ---------------------------------------------------------------------------

test('Engine :: edge :: run with empty pipeline succeeds and returns state', async () => {
  const engine = new Engine();
  const state = await engine.run(makeInput());
  assert.ok(state !== undefined);
  assert.deepStrictEqual(state.colors, []);
  assert.deepStrictEqual(state.roles, {});
  assert.deepStrictEqual(state.outputs, {});
});

test('Engine :: edge :: run skips tasks with lifecycle phase set', async () => {
  const engine = new Engine();
  const skippedCalls: string[] = [];

  // This task has phase set — should be skipped in pipeline execution
  const phaseTask: TaskInterface = {
    'name': 'task:lifecycle',
    'manifest': { 'name': 'task:lifecycle', 'phase': 'onRunStart' },
    run(_state, _ctx) { skippedCalls.push('should-not-run'); },
  };

  engine.adopt(makePlugin('p', [phaseTask]));
  engine.pipeline(['task:lifecycle']);
  await engine.run(makeInput());
  // task.manifest.phase is set → skipped in the pipeline loop
  assert.strictEqual(skippedCalls.length, 0);
});

test('Engine :: edge :: run state has cache available to tasks', async () => {
  const engine = new Engine();
  let capturedCache: Map<string, unknown> | undefined;

  const cacheTask: TaskInterface = {
    'name': 'task:cache',
    'manifest': { 'name': 'task:cache' },
    run(_state, ctx) {
      capturedCache = ctx.cache;
      ctx.cache.set('key', 'value');
    },
  };

  engine.adopt(makePlugin('p', [cacheTask]));
  engine.pipeline(['task:cache']);
  await engine.run(makeInput());
  assert.ok(capturedCache instanceof Map);
  assert.strictEqual(capturedCache.get('key'), 'value');
});

test('Engine :: edge :: run passes math registry to tasks via context', async () => {
  const engine = new Engine();
  let mathInvoked = false;

  const prim: MathPrimitiveInterface = {
    'name': 'math:noop',
    apply(): unknown { mathInvoked = true; return null; },
  };
  engine.math.register(prim);

  const usesMathTask: TaskInterface = {
    'name': 'task:usesMath',
    'manifest': { 'name': 'task:usesMath' },
    run(_state, ctx) { ctx.math.invoke('math:noop'); },
  };

  engine.adopt(makePlugin('p', [usesMathTask]));
  engine.pipeline(['task:usesMath']);
  await engine.run(makeInput());
  assert.strictEqual(mathInvoked, true);
});
