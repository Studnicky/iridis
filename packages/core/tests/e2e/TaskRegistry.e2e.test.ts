/**
 * TaskRegistry end-to-end tests.
 *
 * Exercises the registry public API under load, hook ordering,
 * replace-on-re-register, and error paths.
 */
import { test } from 'node:test';
import type {
  LifecyclePhaseType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { Engine, TaskRegistry } from '@studnicky/iridis';
import { assert }               from './ScenarioRunner.ts';

declare module '@studnicky/iridis' {
  interface PluginMetadataRegistry {
    'startSaw': number;
    'endSaw':   number;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(
  name: string,
  calls?: string[],
  phase?: LifecyclePhaseType,
): TaskInterface {
  const manifest: TaskManifestInterface = { 'name': name, ...(phase !== undefined ? { 'phase': phase } : {}) };
  return {
    'name': name,
    'manifest': manifest,
    run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      calls?.push(name);
    },
  };
}

// ---------------------------------------------------------------------------
// happy: register 50 tasks — list returns 50 in registration order
// ---------------------------------------------------------------------------

test('TaskRegistry e2e :: happy :: register 50 tasks — list returns all in order', () => {
  const registry = new TaskRegistry();
  const names: string[] = [];

  for (let i = 0; i < 50; i++) {
    const name = `task:${i.toString().padStart(3, '0')}`;
    names.push(name);
    registry.register(makeTask(name));
  }

  const manifests = registry.list();
  assert.strictEqual(manifests.length, 50, 'list should return 50 manifests');

  const listedNames = manifests.map((m) => m.name);
  assert.deepStrictEqual(listedNames, names, 'manifests should be in registration order');
});

// ---------------------------------------------------------------------------
// happy: onRunStart and onRunEnd hooks invoked in order with state mutations
// ---------------------------------------------------------------------------

test('TaskRegistry e2e :: happy :: hooks invoked in order with state mutations visible', async () => {
  const engine = new Engine();
  const executionLog: string[] = [];

  const startHook: TaskInterface = {
    'name': 'hook:start',
    'manifest': { 'name': 'hook:start', 'phase': 'onRunStart' },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      executionLog.push('start');
      (state.metadata as Record<string, unknown>)['startSaw'] = state.colors.length;
    },
  };

  const mainTask: TaskInterface = {
    'name': 'task:main',
    'manifest': { 'name': 'task:main' },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      executionLog.push('main');
      state.colors.push({
        'oklch':        { 'l': 0.5, 'c': 0.1, 'h': 120 },
        'rgb':          { 'r': 0.5, 'g': 0.8, 'b': 0.2 },
        'hex':          '#80cc33',
        'alpha':        1,
        'sourceFormat': 'hex',
      });
    },
  };

  const endHook: TaskInterface = {
    'name': 'hook:end',
    'manifest': { 'name': 'hook:end', 'phase': 'onRunEnd' },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      executionLog.push('end');
      // Mutations from main task should be visible here
      (state.metadata as Record<string, unknown>)['endSaw'] = state.colors.length;
    },
  };

  engine.tasks.hook('onRunStart', startHook);
  engine.tasks.register(mainTask);
  engine.tasks.hook('onRunEnd', endHook);
  engine.pipeline(['task:main']);

  const state = await engine.run({ 'colors': [] });

  assert.deepStrictEqual(executionLog, ['start', 'main', 'end'], 'execution order must be start → main → end');
  assert.strictEqual(state.metadata['startSaw'], 0, 'start hook sees 0 colors before main task');
  assert.strictEqual(state.metadata['endSaw'],   1, 'end hook sees 1 color after main task');
});

// ---------------------------------------------------------------------------
// happy: re-registering with same name replaces the task
// ---------------------------------------------------------------------------

test('TaskRegistry e2e :: happy :: re-register same name replaces task', async () => {
  const engine = new Engine();
  const log: string[] = [];

  const v1: TaskInterface = {
    'name': 'task:replaceable',
    'manifest': { 'name': 'task:replaceable' },
    run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void { log.push('v1'); },
  };
  const v2: TaskInterface = {
    'name': 'task:replaceable',
    'manifest': { 'name': 'task:replaceable' },
    run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void { log.push('v2'); },
  };

  engine.tasks.register(v1);
  engine.tasks.register(v2);   // replaces v1
  engine.pipeline(['task:replaceable']);
  await engine.run({ 'colors': [] });

  assert.deepStrictEqual(log, ['v2'], 'resolve should return latest registered instance');
  assert.strictEqual(engine.tasks.resolve('task:replaceable'), v2, 'resolve returns v2 directly');
});

// ---------------------------------------------------------------------------
// edge: manifest.phase makes task skip in main pipeline
// ---------------------------------------------------------------------------

test('TaskRegistry e2e :: edge :: task with manifest.phase skips in main pipeline', async () => {
  const engine = new Engine();
  const ran: string[] = [];

  const lifecycleTask: TaskInterface = {
    'name': 'task:lifecycle',
    'manifest': { 'name': 'task:lifecycle', 'phase': 'onRunStart' },
    run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      ran.push('lifecycle');
    },
  };

  engine.tasks.register(lifecycleTask);
  engine.pipeline(['task:lifecycle']);
  await engine.run({ 'colors': [] });

  assert.strictEqual(ran.length, 0, 'task with manifest.phase should be skipped in pipeline execution');
});

// ---------------------------------------------------------------------------
// unhappy: registering a task with empty name throws
// ---------------------------------------------------------------------------

test('TaskRegistry e2e :: unhappy :: register with empty name throws', () => {
  const registry = new TaskRegistry();

  assert.throws(
    () => registry.register({
      'name': '',
      run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void {},
    }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.toLowerCase().includes('name'), `expected message about name, got: ${(err as Error).message}`);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// unhappy: hook with empty name throws
// ---------------------------------------------------------------------------

test('TaskRegistry e2e :: unhappy :: hook with empty name throws', () => {
  const registry = new TaskRegistry();

  assert.throws(
    () => registry.hook('onRunStart', {
      'name': '',
      run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void {},
    }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.toLowerCase().includes('name'), `expected message about name, got: ${(err as Error).message}`);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// unhappy: resolve('missing') throws
// ---------------------------------------------------------------------------

test('TaskRegistry e2e :: unhappy :: resolve missing name throws', () => {
  const registry = new TaskRegistry();

  assert.throws(
    () => registry.resolve('does:not:exist'),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes('does:not:exist'),
        `expected task name in error message, got: ${(err as Error).message}`,
      );
      return true;
    },
  );
});
