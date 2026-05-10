import type { MathPrimitiveInterface } from './math.ts';
import type { LifecyclePhaseType, TaskInterface, TaskManifestInterface } from './pipeline.ts';

export interface TaskRegistryInterface {
  register(task: TaskInterface): void;
  hook(phase: LifecyclePhaseType, task: TaskInterface): void;
  resolve(name: string): TaskInterface;
  has(name: string): boolean;
  list(): readonly TaskManifestInterface[];
  hooks(phase: LifecyclePhaseType): readonly TaskInterface[];
}

export interface ColorMathRegistryInterface {
  register(primitive: MathPrimitiveInterface): void;
  resolve(name: string): MathPrimitiveInterface;
  has(name: string): boolean;
  list(): readonly string[];
  invoke<TResult = unknown>(name: string, ...args: readonly unknown[]): TResult;
}
