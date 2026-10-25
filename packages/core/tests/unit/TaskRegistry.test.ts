import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../src/interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../src/interfaces/TaskInterface.ts';

import { TaskManifestEntity } from '../../src/entities/TaskManifestEntity.ts';
import { TaskRegistry } from '../../src/registry/TaskRegistry.ts';
import { TASK_REGISTRY_TEST_PATTERNS } from './task-registry/constants/TaskRegistryTestPatterns.ts';

class TaskRegistryTestFixture {
  static noopRun(_state: PaletteStateInterface, _context: PipelineContextInterface): void {}

  static task(name: string): TaskInterface {
    const result: TaskInterface = {
      'manifest': TaskManifestEntity.create({ 'name': name }),
      'name':     name,
      'run':      TaskRegistryTestFixture.noopRun
    };
    return result;
  }

  static runEndTask(name: string): TaskInterface {
    const result: TaskInterface = {
      'manifest': TaskManifestEntity.create({ 'name': name, 'phase': 'onRunEnd' }),
      'name':     name,
      'run':      TaskRegistryTestFixture.noopRun
    };
    return result;
  }

  static runStartTask(name: string): TaskInterface {
    const result: TaskInterface = {
      'manifest': TaskManifestEntity.create({ 'name': name, 'phase': 'onRunStart' }),
      'name':     name,
      'run':      TaskRegistryTestFixture.noopRun
    };
    return result;
  }
}

await test('TaskRegistry registers, resolves, lists, overrides, and increments version', () => {
  const registry = new TaskRegistry();
  const first = TaskRegistryTestFixture.task('task:one');
  const replacement = TaskRegistryTestFixture.task('task:one');
  const second = TaskRegistryTestFixture.task('task:two');

  assert.equal(registry.version(), 0);
  assert.equal(registry.has('task:one'), false);
  assert.deepEqual(registry.list(), []);

  registry.register(first);
  registry.register(second);

  assert.equal(registry.version(), 2);
  assert.equal(registry.has('task:one'), true);
  assert.strictEqual(registry.resolve('task:one'), first);
  assert.deepEqual(registry.list().map((manifest) => { const result = manifest.name; return result; }), ['task:one', 'task:two']);

  registry.register(replacement);

  assert.equal(registry.version(), 3);
  assert.strictEqual(registry.resolve('task:one'), replacement);
  assert.deepEqual(registry.list().map((manifest) => { const result = manifest.name; return result; }), ['task:one', 'task:two']);
});

await test('TaskRegistry rejects missing task names during registration', () => {
  const registry = new TaskRegistry();

  assert.throws(
    () => { registry.register(TaskRegistryTestFixture.runStartTask('')); },
    TASK_REGISTRY_TEST_PATTERNS.taskNameRequired
  );
});

await test('TaskRegistry resolves unknown names with an addressed error', () => {
  const registry = new TaskRegistry();

  assert.throws(
    () => { registry.resolve('task:missing'); },
    TASK_REGISTRY_TEST_PATTERNS.noRegisteredTask
  );
  assert.throws(
    () => { registry.resolve('task:missing'); },
    TASK_REGISTRY_TEST_PATTERNS.missingTaskName
  );
});

await test('TaskRegistry maintains phase queues and re-adopts a hook under its current phase', () => {
  const registry = new TaskRegistry();
  const start = TaskRegistryTestFixture.runStartTask('hook:start');
  const end = TaskRegistryTestFixture.runEndTask('hook:end');
  const reAdopted = TaskRegistryTestFixture.runEndTask('hook:start');

  registry.hook(start);
  registry.hook(end);

  assert.equal(registry.version(), 2);
  assert.strictEqual(registry.resolve('hook:start'), start);
  assert.deepEqual(registry.onRunStartTasks(), [start]);
  assert.deepEqual(registry.onRunEndTasks(), [end]);

  registry.hook(reAdopted);

  assert.equal(registry.version(), 3);
  assert.strictEqual(registry.resolve('hook:start'), reAdopted);
  assert.deepEqual(registry.onRunStartTasks(), []);
  assert.deepEqual(registry.onRunEndTasks(), [end, reAdopted]);
});

await test('TaskRegistry rejects missing task names during hook registration', () => {
  const registry = new TaskRegistry();

  assert.throws(
    () => { registry.hook(TaskRegistryTestFixture.runStartTask('')); },
    TASK_REGISTRY_TEST_PATTERNS.taskNameRequired
  );
});
