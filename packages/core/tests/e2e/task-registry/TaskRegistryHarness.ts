import assert from 'node:assert/strict';

import type { PaletteStateInterface } from '../../../src/interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../../src/interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../../src/interfaces/TaskInterface.ts';

import { Engine } from '../../../src/engine/Engine.ts';
import { ColorRecordEntity } from '../../../src/entities/ColorRecordEntity.ts';
import { InputEntity } from '../../../src/entities/InputEntity.ts';
import { TaskManifestEntity } from '../../../src/entities/TaskManifestEntity.ts';
import { TaskRegistry } from '../../../src/registry/TaskRegistry.ts';
import { TASK_REGISTRY_ERROR_PATTERNS } from './constants/TaskRegistryErrorPatterns.ts';

export class TaskRegistryHarness {
  static verify(): void {
    TaskRegistryHarness.verifyRegistration();
    TaskRegistryHarness.verifyHooks();
    TaskRegistryHarness.verifyReplacement();
    TaskRegistryHarness.verifyPhaseSkip();
    TaskRegistryHarness.verifyErrors();
  }

  private static verifyRegistration(): void {
    const registry = new TaskRegistry();
    const names: string[] = [];
    for (let index = 0; index < 50; index += 1) {
      const name = `task:${index.toString().padStart(3, '0')}`;
      names.push(name);
      registry.register(TaskRegistryHarness.task(name, TaskRegistryHarness.noOp()));
    }
    const listedNames = registry.list().map((manifest) => { return manifest.name; });
    assert.strictEqual(registry.list().length, 50, 'registers all tasks');
    assert.deepStrictEqual(listedNames, names, 'lists manifests in registration order');
    assert.strictEqual(registry.resolve('task:000').name, 'task:000', 'resolves a registered task');

    const empty = new TaskRegistry();
    assert.strictEqual(empty.list().length, 0, 'lists no tasks from an empty registry');
  }

  private static verifyHooks(): void {
    const engine = new Engine();
    const execution: string[] = [];
    const observedColorCounts: number[] = [];

    engine.tasks.hook(TaskRegistryHarness.runStartTask(
      'hook:start',
      TaskRegistryHarness.observeColorCount(execution, 'start', observedColorCounts)
    ));
    engine.tasks.register(TaskRegistryHarness.task('task:main', TaskRegistryHarness.appendColor(execution, 'main')));
    engine.tasks.hook(TaskRegistryHarness.runEndTask(
      'hook:end',
      TaskRegistryHarness.observeColorCount(execution, 'end', observedColorCounts)
    ));
    engine.pipeline(['task:main']);

    const state = engine.run(TaskRegistryHarness.emptyInput());
    assert.deepStrictEqual(execution, ['start', 'main', 'end'], 'runs hooks around the pipeline task');
    assert.deepStrictEqual(observedColorCounts, [0, 1], 'hooks observe state before and after the task mutation');
    assert.strictEqual(state.colors.length, 1, 'main task appends one color');
  }

  private static verifyReplacement(): void {
    const engine = new Engine();
    const execution: string[] = [];
    const replacement = TaskRegistryHarness.task('task:replaceable', TaskRegistryHarness.record(execution, 'v2'));

    engine.tasks.register(TaskRegistryHarness.task('task:replaceable', TaskRegistryHarness.record(execution, 'v1')));
    engine.tasks.register(replacement);
    engine.pipeline(['task:replaceable']);
    engine.run(TaskRegistryHarness.emptyInput());

    assert.deepStrictEqual(execution, ['v2'], 'runs only the replacement task');
    assert.strictEqual(engine.tasks.resolve('task:replaceable'), replacement, 'resolves the replacement task');
  }

  private static verifyPhaseSkip(): void {
    const engine = new Engine();
    const execution: string[] = [];
    engine.tasks.register(TaskRegistryHarness.runStartTask('task:lifecycle', TaskRegistryHarness.record(execution, 'lifecycle')));
    engine.pipeline(['task:lifecycle']);
    engine.run(TaskRegistryHarness.emptyInput());

    assert.deepStrictEqual(execution, [], 'does not execute lifecycle tasks in the main pipeline');
  }

  private static verifyErrors(): void {
    const registry = new TaskRegistry();
    assert.throws(
      () => { registry.register(TaskRegistryHarness.task('', TaskRegistryHarness.noOp())); },
      TASK_REGISTRY_ERROR_PATTERNS.taskName,
      'rejects an empty registered task name'
    );
    assert.throws(
      () => { registry.hook(TaskRegistryHarness.runStartTask('', TaskRegistryHarness.noOp())); },
      TASK_REGISTRY_ERROR_PATTERNS.taskName,
      'rejects an empty hook task name'
    );
    assert.throws(
      () => { registry.resolve('does:not:exist'); },
      TASK_REGISTRY_ERROR_PATTERNS.missingTask,
      'reports the missing task name'
    );
  }

  private static task(name: string, run: TaskInterface['run']): TaskInterface {
    const manifest = TaskManifestEntity.create({ 'name': name });
    return { 'manifest': manifest, 'name': name, 'run': run };
  }

  private static runStartTask(name: string, run: TaskInterface['run']): TaskInterface {
    const manifest = TaskManifestEntity.create({ 'name': name, 'phase': 'onRunStart' });
    return { 'manifest': manifest, 'name': name, 'run': run };
  }

  private static runEndTask(name: string, run: TaskInterface['run']): TaskInterface {
    const manifest = TaskManifestEntity.create({ 'name': name, 'phase': 'onRunEnd' });
    return { 'manifest': manifest, 'name': name, 'run': run };
  }

  private static emptyInput(): InputEntity.Type {
    const result = InputEntity.intake({ 'colors': [] });
    return result;
  }

  private static noOp(): TaskInterface['run'] {
    return (_state: PaletteStateInterface, _context: PipelineContextInterface): void => {};
  }

  private static record(execution: string[], label: string): TaskInterface['run'] {
    return (_state: PaletteStateInterface, _context: PipelineContextInterface): void => {
      execution.push(label);
    };
  }

  private static observeColorCount(execution: string[], label: string, observedColorCounts: number[]): TaskInterface['run'] {
    return (state: PaletteStateInterface, _context: PipelineContextInterface): void => {
      execution.push(label);
      observedColorCounts.push(state.colors.length);
    };
  }

  private static appendColor(execution: string[], label: string): TaskInterface['run'] {
    return (state: PaletteStateInterface, _context: PipelineContextInterface): void => {
      execution.push(label);
      state.colors.push(ColorRecordEntity.create({
        'alpha': 1,
        'hex': '#80cc33',
        'oklch': { 'c': 0.1, 'h': 120, 'l': 0.5 },
        'rgb': { 'b': 0.2, 'g': 0.8, 'r': 0.5 },
        'sourceFormat': 'hex'
      }));
    };
  }
}
