import type {
  LifecyclePhaseType,
  TaskInterface,
  TaskManifestInterface,
  TaskRegistryInterface,
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
    if (!task.name) {
      throw new Error('TaskRegistry.register: task.name is required');
    }
    this.entries.set(task.name, task);
  }

  hook(phase: LifecyclePhaseType, task: TaskInterface): void {
    if (!task.name) {
      throw new Error('TaskRegistry.hook: task.name is required');
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

    if (!task) {
      throw new Error(`TaskRegistry.resolve: no task registered with name '${name}'`);
    }

    return task;
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  list(): readonly TaskManifestInterface[] {
    const out: TaskManifestInterface[] = [];

    for (const task of this.entries.values()) {
      out.push(task.manifest ?? { 'name': task.name });
    }

    return out;
  }

  hooks(phase: LifecyclePhaseType): readonly TaskInterface[] {
    return phase === 'onRunStart' ? this.onRunStart : this.onRunEnd;
  }
}
