import type { TaskManifestInterfaceTypeEntity } from '../entities/TaskManifestInterfaceTypeEntity.ts';
import type { TaskInterface } from './TaskInterface.ts';

export interface TaskRegistryInterface {
  has(name: string): boolean;
  hook(task: TaskInterface): void;
  list(): readonly TaskManifestInterfaceTypeEntity.Type[];
  onRunEndTasks(): readonly TaskInterface[];
  onRunStartTasks(): readonly TaskInterface[];
  register(task: TaskInterface): void;
  resolve(name: string): TaskInterface;
}
