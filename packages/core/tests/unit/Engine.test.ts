import type {
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  PluginInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { Engine } from '@studnicky/iridis/engine';
import { assert } from './ScenarioRunner.ts';
import { test } from 'node:test';

declare module '@studnicky/iridis' {
  interface PluginMetadataRegistry {
    'seed': string;
  }
}

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

function makePlugin(name: string, tasks: TaskInterface[]): PluginInterface {
  return {
    'name': name,
    'version': '0.0.1',
    tasks(): readonly TaskInterface[] { return tasks; },
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

test('Engine :: edge :: adopt-routed onRunStart task fires via hook, not in main pipeline loop', async () => {
  const engine = new Engine();
  const hookCalls: string[] = [];

  // P1.3: adopt() routes phased tasks through hook(). The task fires once as a hook,
  // not as a main-loop task. The pipeline loop skips tasks with phase set.
  const phaseTask: TaskInterface = {
    'name': 'task:lifecycle',
    'manifest': { 'name': 'task:lifecycle', 'phase': 'onRunStart' },
    run(_state, _ctx) { hookCalls.push('hook-fired'); },
  };

  engine.adopt(makePlugin('p', [phaseTask]));
  engine.pipeline(['task:lifecycle']);
  await engine.run(makeInput());
  // fires exactly once as an onRunStart hook (not zero, not twice)
  assert.strictEqual(hookCalls.length, 1);
  assert.strictEqual(hookCalls[0], 'hook-fired');
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

// ---------------------------------------------------------------------------
// P1.3 — adopt routes phased tasks through hooks
// ---------------------------------------------------------------------------

test('Engine :: P1.3 :: adopt routes onRunStart task through hook, not register', () => {
  const engine = new Engine();
  const hookTask: TaskInterface = {
    'name':     'hook:onstart',
    'manifest': { 'name': 'hook:onstart', 'phase': 'onRunStart' },
    run(_state, _ctx): void { /* no-op */ },
  };
  engine.adopt(makePlugin('p', [hookTask]));

  // The task is resolvable by name (hook() stores it in entries too)
  assert.strictEqual(engine.tasks.has('hook:onstart'), true);
  // It appears in the onRunStart hook list
  const startHooks = engine.tasks.hooks('onRunStart');
  assert.strictEqual(startHooks.length, 1);
  assert.strictEqual(startHooks[0]?.name, 'hook:onstart');
  // It does NOT appear in the onRunEnd hook list
  assert.strictEqual(engine.tasks.hooks('onRunEnd').length, 0);
});

test('Engine :: P1.3 :: adopt routes onRunEnd task through hook, not register', () => {
  const engine = new Engine();
  const hookTask: TaskInterface = {
    'name':     'hook:onend',
    'manifest': { 'name': 'hook:onend', 'phase': 'onRunEnd' },
    run(_state, _ctx): void { /* no-op */ },
  };
  engine.adopt(makePlugin('p', [hookTask]));

  assert.strictEqual(engine.tasks.has('hook:onend'), true);
  const endHooks = engine.tasks.hooks('onRunEnd');
  assert.strictEqual(endHooks.length, 1);
  assert.strictEqual(endHooks[0]?.name, 'hook:onend');
  assert.strictEqual(engine.tasks.hooks('onRunStart').length, 0);
});

test('Engine :: P1.3 :: adopt fires onRunStart hook before main task during run', async () => {
  const engine = new Engine();
  const executionOrder: string[] = [];

  const hookTask: TaskInterface = {
    'name':     'hook:start',
    'manifest': { 'name': 'hook:start', 'phase': 'onRunStart' },
    run(_state, _ctx): void { executionOrder.push('hook'); },
  };
  const mainTask: TaskInterface = {
    'name':     'task:main',
    'manifest': { 'name': 'task:main' },
    run(_state, _ctx): void { executionOrder.push('main'); },
  };

  engine.adopt(makePlugin('mixed-plugin', [hookTask, mainTask]));
  engine.pipeline(['task:main']);
  await engine.run(makeInput());

  assert.strictEqual(executionOrder[0], 'hook', 'hook must fire before main task');
  assert.strictEqual(executionOrder[1], 'main', 'main task fires after hook');
  assert.strictEqual(executionOrder.length, 2);
});

test('Engine :: P1.3 :: adopt separates mixed phased and ordinary tasks correctly', async () => {
  const engine = new Engine();
  const executionOrder: string[] = [];

  const startHook: TaskInterface = {
    'name':     'hook:start',
    'manifest': { 'name': 'hook:start', 'phase': 'onRunStart' },
    run(_state, _ctx): void { executionOrder.push('start-hook'); },
  };
  const endHook: TaskInterface = {
    'name':     'hook:end',
    'manifest': { 'name': 'hook:end', 'phase': 'onRunEnd' },
    run(_state, _ctx): void { executionOrder.push('end-hook'); },
  };
  const mainTask: TaskInterface = {
    'name':     'task:work',
    'manifest': { 'name': 'task:work' },
    run(_state, _ctx): void { executionOrder.push('work'); },
  };

  engine.adopt(makePlugin('full-plugin', [startHook, mainTask, endHook]));
  engine.pipeline(['task:work']);
  await engine.run(makeInput());

  assert.deepStrictEqual(executionOrder, ['start-hook', 'work', 'end-hook']);
});

// ---------------------------------------------------------------------------
// P1.4 — pipeline enforces manifest.requires ordering
// ---------------------------------------------------------------------------

test('Engine :: P1.4 :: pipeline accepts correct dependency order', () => {
  const engine = new Engine();

  const depTask: TaskInterface = {
    'name':     'task:dep',
    'manifest': { 'name': 'task:dep' },
    run(_state, _ctx): void { /* no-op */ },
  };
  const consumerTask: TaskInterface = {
    'name':     'task:consumer',
    'manifest': { 'name': 'task:consumer', 'requires': ['task:dep'] },
    run(_state, _ctx): void { /* no-op */ },
  };

  engine.adopt(makePlugin('p', [depTask, consumerTask]));

  // dep before consumer — should not throw
  engine.pipeline(['task:dep', 'task:consumer']);
  assert.strictEqual(engine.tasks.has('task:dep'),      true);
  assert.strictEqual(engine.tasks.has('task:consumer'), true);
});

test('Engine :: P1.4 :: pipeline throws when required task appears after dependent', () => {
  const engine = new Engine();

  const depTask: TaskInterface = {
    'name':     'task:dep',
    'manifest': { 'name': 'task:dep' },
    run(_state, _ctx): void { /* no-op */ },
  };
  const consumerTask: TaskInterface = {
    'name':     'task:consumer',
    'manifest': { 'name': 'task:consumer', 'requires': ['task:dep'] },
    run(_state, _ctx): void { /* no-op */ },
  };

  engine.adopt(makePlugin('p', [depTask, consumerTask]));

  assert.throws(
    () => engine.pipeline(['task:consumer', 'task:dep']),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes('task:consumer') && err.message.includes('task:dep'),
        `expected error to mention both task names, got: ${err.message}`,
      );
      assert.ok(
        err.message.includes('must appear earlier'),
        `expected 'must appear earlier' in message, got: ${err.message}`,
      );
      return true;
    },
  );
});

test('Engine :: P1.4 :: pipeline throws when required task is missing from pipeline entirely', () => {
  const engine = new Engine();

  const depTask: TaskInterface = {
    'name':     'task:dep',
    'manifest': { 'name': 'task:dep' },
    run(_state, _ctx): void { /* no-op */ },
  };
  const consumerTask: TaskInterface = {
    'name':     'task:consumer',
    'manifest': { 'name': 'task:consumer', 'requires': ['task:dep'] },
    run(_state, _ctx): void { /* no-op */ },
  };

  engine.adopt(makePlugin('p', [depTask, consumerTask]));

  assert.throws(
    () => engine.pipeline(['task:consumer']),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes('task:dep') && err.message.includes('missing from the pipeline'),
        `expected missing-from-pipeline error, got: ${err.message}`,
      );
      return true;
    },
  );
});

test('Engine :: P1.4 :: pipeline skips requires validation for math primitive names', () => {
  const engine = new Engine();

  // Task with requires pointing at math primitive names (not pipeline tasks)
  const taskWithMathRequires: TaskInterface = {
    'name':     'task:usesmath',
    'manifest': { 'name': 'task:usesmath', 'requires': ['someMathPrimitive'] },
    run(_state, _ctx): void { /* no-op */ },
  };

  engine.adopt(makePlugin('p', [taskWithMathRequires]));

  // 'someMathPrimitive' is not a registered task — should not throw
  engine.pipeline(['task:usesmath']);
  assert.strictEqual(engine.tasks.has('task:usesmath'), true);
});
