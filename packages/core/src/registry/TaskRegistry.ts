import { ModuleError, ValidationError } from '@studnicky/errors';

import type {
  LifecyclePhaseType,
  TaskInterface,
  TaskManifestInterfaceType,
  TaskRegistryInterface
} from '../types/index.ts';

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

  hook(phase: LifecyclePhaseType, task: TaskInterface): void {
    if (task.name === '') {
      throw ValidationError.create({ 'message': 'task.name is required', 'path': 'TaskRegistry.hook' });
    }
    this.entries.set(task.name, task);
    // A task hooked under a name already present in either phase queue is a
    // deliberate re-adopt/override (see class docstring); drop the prior
    // instance from both queues first so it doesn't keep firing alongside
    // (or instead of, if the phase changed) the new one.
    this.removeFromPhase(this.onRunStart, task.name);
    this.removeFromPhase(this.onRunEnd, task.name);
    this.mutations++;
    if (phase === 'onRunStart') {
      this.onRunStart.push(task);

      return;
    }
    this.onRunEnd.push(task);
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

  list(): readonly TaskManifestInterfaceType[] {
    const out: TaskManifestInterfaceType[] = [];

    for (const task of this.entries.values()) {
      out.push(task.manifest ?? { 'description': undefined, 'name': task.name, 'phase': undefined, 'reads': undefined, 'requires': undefined, 'writes': undefined });
    }

    return out;
  }

  hooks(phase: LifecyclePhaseType): readonly TaskInterface[] {
    return phase === 'onRunStart' ? this.onRunStart : this.onRunEnd;
  }

  /**
   * Current mutation count, bumped by `register()` and `hook()`. Callers
   * that memoize a derivative of the registry's contents can compare two
   * reads of this value to know whether that derivative is stale.
   */
  version(): number {
    return this.mutations;
  }

  /** Removes the first task named `name` from `queue`, if present. */
  private removeFromPhase(queue: TaskInterface[], name: string): void {
    const index = queue.findIndex((task) => { const result = task.name === name; return result; });

    if (index !== -1) {
      queue.splice(index, 1);
    }
  }
}
