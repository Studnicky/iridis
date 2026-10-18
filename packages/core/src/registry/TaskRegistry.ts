import { ModuleError, ValidationError } from '@studnicky/errors/node';

import type { TaskInterface } from '../interfaces/TaskInterface.ts';
import type { TaskRegistryInterface } from '../interfaces/TaskRegistryInterface.ts';

import { TaskManifestInterfaceTypeEntity } from '../entities/TaskManifestInterfaceTypeEntity.ts';

/**
 * Holds the mutable set of pipeline tasks an `Engine` will run. Tasks
 * are addressed by name, so registering a task with an existing name is
 * a deliberate override (used by plugins to swap built-ins).
 *
 * Hook tasks live in the same name table as ordered tasks but additionally
 * reside in per-phase queues fired by the engine before/after the main
 * sequence. The phase a task was hooked into is the phase it fires in;
 * the same task may not currently be hooked into multiple phases.
 */
export class TaskRegistry implements TaskRegistryInterface {
  private readonly entries = new Map<string, TaskInterface>();

  private readonly onRunStart: TaskInterface[] = [];

  private readonly onRunEnd:   TaskInterface[] = [];

  /**
   * Monotonic counter bumped by every `register()`/`hook()` call. Lets a
   * caller (the `Engine`) detect that the registry changed since it last
   * built a derivative (e.g. a resolved task sequence) by comparing two
   * reads, without diffing `entries`.
   */
  private mutations = 0;

  register(task: TaskInterface): void {
    if (task.name === '') {
      throw ValidationError.create({ 'message': 'task.name is required', 'path': 'TaskRegistry.register' });
    }
    this.entries.set(task.name, task);
    this.mutations++;
  }

  hook(task: TaskInterface): void {
    const phase = task.manifest?.phase;
    if (phase === 'onRunStart') {
      this.addHook(this.onRunStart, task);
      return;
    }
    if (phase === 'onRunEnd') {
      this.addHook(this.onRunEnd, task);
      return;
    }
    throw ValidationError.create({ 'message': 'task.manifest.phase is required', 'path': 'TaskRegistry.hook' });
  }

  resolve(name: string): TaskInterface {
    const task = this.entries.get(name);

    if (task === undefined) {
      throw ModuleError.create(`TaskRegistry.resolve: no task registered with name '${name}'`, {
        'context':  { 'taskName': name },
        'scenario': 'NOT_FOUND'
      });
    }

    return task;
  }

  has(name: string): boolean {
    const result = this.entries.has(name);
    return result;
  }

  list(): readonly TaskManifestInterfaceTypeEntity.Type[] {
    const out: TaskManifestInterfaceTypeEntity.Type[] = [];

    for (const task of this.entries.values()) {
      out.push(task.manifest ?? TaskManifestInterfaceTypeEntity.create({ 'name': task.name }));
    }

    return out;
  }

  onRunStartTasks(): readonly TaskInterface[] {
    return this.onRunStart;
  }

  onRunEndTasks(): readonly TaskInterface[] {
    return this.onRunEnd;
  }

  /**
   * Current mutation count, bumped by `register()` and `hook()`. Callers
   * that memoize a derivative of the registry's contents can compare two
   * reads of this value to know whether that derivative is stale.
   */
  version(): number {
    return this.mutations;
  }

  private addHook(queue: TaskInterface[], task: TaskInterface): void {
    if (task.name === '') {
      throw ValidationError.create({ 'message': 'task.name is required', 'path': 'TaskRegistry.hook' });
    }
    this.entries.set(task.name, task);
    this.removeFromPhase(this.onRunStart, task.name);
    this.removeFromPhase(this.onRunEnd, task.name);
    this.mutations++;
    queue.push(task);
  }

  /** Removes the first task named `name` from `queue`, if present. */
  private removeFromPhase(queue: TaskInterface[], name: string): void {
    const index = queue.findIndex((task) => { const result = task.name === name; return result; });

    if (index !== -1) {
      queue.splice(index, 1);
    }
  }
}
