import type { LifecyclePhaseType, TaskInterface, TaskManifestInterface } from './pipeline.ts';

export interface TaskRegistryInterface {
  register(task: TaskInterface): void;
  hook(phase: LifecyclePhaseType, task: TaskInterface): void;
  resolve(name: string): TaskInterface;
  has(name: string): boolean;
  list(): readonly TaskManifestInterface[];
  hooks(phase: LifecyclePhaseType): readonly TaskInterface[];
}
