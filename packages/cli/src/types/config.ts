import type { InputInterface } from '@studnicky/iridis/model';
import type { InferType }     from '@studnicky/json-tology/types';

import type { CliConfigSchema }    from '../CliConfigSchema.ts';

export interface CliConfigInterface {
  readonly 'enableCapacitor'?:  boolean;
  readonly 'enableContrast'?:   boolean;
  readonly 'enableImage'?:      boolean;
  readonly 'enableRdf'?:        boolean;
  readonly 'enableStylesheet'?: boolean;
  readonly 'enableTailwind'?:   boolean;
  readonly 'enableVscode'?:     boolean;
  readonly 'input':             InputInterface;
  readonly 'output': {
    readonly 'directory': string;
    readonly 'files':     Record<string, string>;
  };
  readonly 'pipeline':          readonly string[];
}

/** Schema-derived type for CLI config (validation shape from CliConfigSchema). */
export type CliConfigSchemaType = InferType<typeof CliConfigSchema>;
