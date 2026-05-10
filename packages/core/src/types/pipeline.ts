import type { ColorMathRegistryInterface, TaskRegistryInterface } from './registry.ts';
import type { EngineInterface } from './engine.ts';
import type { PaletteStateInterface } from './state.ts';

export type LifecyclePhaseType = 'onRunStart' | 'onRunEnd';

export interface LoggerInterface {
  debug(scope: string, op: string, message: string, data?: unknown): void;
  info(scope: string, op: string, message: string, data?: unknown):  void;
  warn(scope: string, op: string, message: string, data?: unknown):  void;
  error(scope: string, op: string, message: string, data?: unknown): void;
}

export interface PipelineContextInterface {
  readonly engine:    EngineInterface;
  readonly tasks:     TaskRegistryInterface;
  readonly math:      ColorMathRegistryInterface;
  readonly logger:    LoggerInterface;
  readonly startedAt: number;
  readonly cache:     Map<string, unknown>;
}

export interface TaskManifestInterface {
  readonly name:           string;
  readonly phase?:         LifecyclePhaseType;
  readonly reads?:         readonly string[];
  readonly writes?:        readonly string[];
  readonly requires?:      readonly string[];
  readonly description?:   string;
}

export interface TaskInterface {
  readonly name:      string;
  readonly manifest?: TaskManifestInterface;
  run(state: PaletteStateInterface, ctx: PipelineContextInterface): Promise<void> | void;
}
