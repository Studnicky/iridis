import type { LoggerInterface } from '@studnicky/logger/interfaces';

import type { EngineInterface } from './engine.ts';
import type { TaskRegistryInterface } from './registry.ts';
import type { PaletteStateInterface } from './state.ts';

export type LifecyclePhaseType = 'onRunStart' | 'onRunEnd';

export interface PipelineContextInterface {
  readonly 'engine':    EngineInterface;
  readonly 'logger':    LoggerInterface;
  readonly 'startedAt': number;
  readonly 'tasks':     TaskRegistryInterface;
}

export type TaskManifestInterfaceType = {
  'description': string | undefined;
  'name':        string;
  'phase':       LifecyclePhaseType | undefined;
  'reads':       string[] | undefined;
  'requires':    string[] | undefined;
  'writes':      string[] | undefined;
};

export interface TaskInterface {
  readonly 'manifest': TaskManifestInterfaceType | undefined;
  readonly 'name':     string;
  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void;
}
