import type { LifecyclePhaseType, TaskManifestInterfaceType } from '../types/pipeline.ts';
import type { TaskInterface } from './TaskInterface.ts';

export interface TaskRegistryInterface {
  has(name: string): boolean;
  hook(phase: LifecyclePhaseType, task: TaskInterface): void;
  hooks(phase: LifecyclePhaseType): readonly TaskInterface[];
  list(): readonly TaskManifestInterfaceType[];
  register(task: TaskInterface): void;
  resolve(name: string): TaskInterface;
}
