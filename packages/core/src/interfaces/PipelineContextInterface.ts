import type { LoggerInterface } from '@studnicky/logger/interfaces';

import type { EngineInterface } from './EngineInterface.ts';
import type { TaskRegistryInterface } from './TaskRegistryInterface.ts';

export interface PipelineContextInterface {
  readonly 'engine':    EngineInterface;
  readonly 'logger':    LoggerInterface;
  readonly 'startedAt': number;
  readonly 'tasks':     TaskRegistryInterface;
}
