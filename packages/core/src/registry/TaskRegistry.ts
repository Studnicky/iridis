import type {
  LifecyclePhaseType,
  TaskInterface,
  TaskManifestInterface,
  TaskRegistryInterface,
} from '../types/index.ts';

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
