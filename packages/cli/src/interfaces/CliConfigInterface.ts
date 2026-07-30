import type { InputInterface } from '@studnicky/iridis/model';

import type { CliOutputEntity } from '../entities/CliOutputEntity.ts';

export interface CliConfigInterface {
  readonly 'enableCapacitor':  boolean | undefined;
  readonly 'enableContrast':   boolean | undefined;
  readonly 'enableImage':      boolean | undefined;
  readonly 'enableRdf':        boolean | undefined;
  readonly 'enableStylesheet': boolean | undefined;
  readonly 'enableTailwind':   boolean | undefined;
  readonly 'enableVscode':     boolean | undefined;
  readonly 'input':            InputInterface;
  readonly 'output':           CliOutputEntity.Type;
  readonly 'pipeline':         readonly string[];
}
