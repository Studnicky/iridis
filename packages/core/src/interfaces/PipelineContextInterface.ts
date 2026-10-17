import type { LoggerInterface } from '@studnicky/logger/interfaces';

export interface PipelineContextInterface {
  readonly 'logger':    LoggerInterface;
  readonly 'startedAt': number;
}
