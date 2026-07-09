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

  register(task: TaskInterface): void {
    if (task.name === '') {
      throw ValidationError.create({ 'message': 'task.name is required', 'path': 'TaskRegistry.register' });
    }
    this.entries.set(task.name, task);
  }

  hook(phase: LifecyclePhaseType, task: TaskInterface): void {
    if (task.name === '') {
      throw ValidationError.create({ 'message': 'task.name is required', 'path': 'TaskRegistry.hook' });
    }
    this.entries.set(task.name, task);
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
      out.push(task.manifest ?? { 'name': task.name });
    }

    return out;
  }

  hooks(phase: LifecyclePhaseType): readonly TaskInterface[] {
    return phase === 'onRunStart' ? this.onRunStart : this.onRunEnd;
  }
}
