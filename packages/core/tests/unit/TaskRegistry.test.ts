import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { TaskRegistry } from '@studnicky/iridis/registry';
import { ScenarioRunner, assert } from './ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

function makeTask(name: string, phase?: 'onRunStart' | 'onRunEnd'): TaskInterface {
  const manifest: TaskManifestInterface = { 'name': name, ...(phase ? { 'phase': phase } : {}) };
  return {
    'name': name,
    'manifest': manifest,
    run(_state: PaletteStateInterface, _ctx: PipelineContextInterface): void { /* no-op */ },
  };
}

// ---------------------------------------------------------------------------
// register / resolve / has / list
// ---------------------------------------------------------------------------

type RegistryInput =
  | { 'op': 'register'; 'task': TaskInterface }
  | { 'op': 'resolve';  'name': string }
  | { 'op': 'has';      'name': string }
  | { 'op': 'list' }
  | { 'op': 'hook'; 'phase': 'onRunStart' | 'onRunEnd'; 'task': TaskInterface }
  | { 'op': 'hooks'; 'phase': 'onRunStart' | 'onRunEnd' };

type RegistryOutput =
  | TaskInterface
  | boolean
  | readonly TaskManifestInterface[]
  | readonly TaskInterface[]
  | void;

function runRegistryOp(registry: TaskRegistry, input: RegistryInput): RegistryOutput {
  switch (input.op) {
    case 'register': return registry.register(input.task);
    case 'resolve':  return registry.resolve(input.name);
    case 'has':      return registry.has(input.name);
    case 'list':     return registry.list();
    case 'hook':     return registry.hook(input.phase, input.task);
    case 'hooks':    return registry.hooks(input.phase);
  }
}

// ---------------------------------------------------------------------------
// Happy-path scenarios (each gets a fresh registry)
// ---------------------------------------------------------------------------

const happyRunner = new ScenarioRunner<
  RegistryInput,
  RegistryOutput
>(
  'TaskRegistry',
  (input) => {
    const registry = new TaskRegistry();
    const task = makeTask('test:task');
    registry.register(task);
    return runRegistryOp(registry, input);
  },
);

happyRunner.run([
  {
    'name': 'register then has returns true',
    'kind': 'happy',
    'input': { 'op': 'has', 'name': 'test:task' },
    assert(output, error) {
      assert.ifError(error);
      assert.strictEqual(output, true);
    },
  },
  {
    'name': 'register then resolve returns task',
    'kind': 'happy',
    'input': { 'op': 'resolve', 'name': 'test:task' },
    assert(output, error) {
      assert.ifError(error);
      assert.ok(output !== undefined);
      assert.strictEqual((output as TaskInterface).name, 'test:task');
    },
  },
  {
    'name': 'list returns manifests for all registered tasks',
    'kind': 'happy',
    'input': { 'op': 'list' },
    assert(output, error) {
      assert.ifError(error);
      const manifests = output as readonly TaskManifestInterface[];
      assert.strictEqual(manifests.length, 1);
      assert.strictEqual(manifests[0]?.name, 'test:task');
    },
  },
]);

// ---------------------------------------------------------------------------
// Hook scenarios (fresh registry per scenario)
// ---------------------------------------------------------------------------

import { test } from 'node:test';

test('TaskRegistry :: happy :: hook onRunStart registers and retrieves task', () => {
  const registry = new TaskRegistry();
  const hookTask = makeTask('hook:start', 'onRunStart');
  registry.hook('onRunStart', hookTask);
  const hooks = registry.hooks('onRunStart');
  assert.strictEqual(hooks.length, 1);
  assert.strictEqual(hooks[0]?.name, 'hook:start');
  // must also be resolvable by name
  const resolved = registry.resolve('hook:start');
  assert.strictEqual(resolved.name, 'hook:start');
});

test('TaskRegistry :: happy :: hook onRunEnd registers and retrieves task', () => {
  const registry = new TaskRegistry();
  const hookTask = makeTask('hook:end', 'onRunEnd');
  registry.hook('onRunEnd', hookTask);
  const hooks = registry.hooks('onRunEnd');
  assert.strictEqual(hooks.length, 1);
  assert.strictEqual(hooks[0]?.name, 'hook:end');
});

test('TaskRegistry :: happy :: hooks returns empty array for unused phase', () => {
  const registry = new TaskRegistry();
  assert.strictEqual(registry.hooks('onRunStart').length, 0);
  assert.strictEqual(registry.hooks('onRunEnd').length, 0);
});

test('TaskRegistry :: edge :: has returns false for unregistered name', () => {
  const registry = new TaskRegistry();
  assert.strictEqual(registry.has('not:registered'), false);
});

test('TaskRegistry :: edge :: list returns empty array when no tasks registered', () => {
  const registry = new TaskRegistry();
  assert.strictEqual(registry.list().length, 0);
});

// ---------------------------------------------------------------------------
// Unhappy scenarios
// ---------------------------------------------------------------------------

test('TaskRegistry :: unhappy :: resolve unknown name throws', () => {
  const registry = new TaskRegistry();
  assert.throws(
    () => registry.resolve('unknown:task'),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('no task registered'));
      return true;
    },
  );
});

test('TaskRegistry :: unhappy :: register task without name throws', () => {
  const registry = new TaskRegistry();
  const nameless = makeTask('');
  assert.throws(
    () => registry.register(nameless),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('task.name is required'));
      return true;
    },
  );
});

test('TaskRegistry :: unhappy :: hook task without name throws', () => {
  const registry = new TaskRegistry();
  const nameless = makeTask('');
  assert.throws(
    () => registry.hook('onRunStart', nameless),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('task.name is required'));
      return true;
    },
  );
});
