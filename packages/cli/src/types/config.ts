import type { InputInterface } from '@studnicky/iridis/model';
import type { FromSchema }    from 'json-schema-to-ts';
import { CliConfigSchema }    from '../CliConfigSchema.ts';

export interface CliConfigInterface {
  readonly 'input':             InputInterface;
  readonly 'enableVscode'?:     boolean;
  readonly 'enableStylesheet'?: boolean;
  readonly 'enableTailwind'?:   boolean;
  readonly 'enableImage'?:      boolean;
  readonly 'enableContrast'?:   boolean;
  readonly 'enableCapacitor'?:  boolean;
  readonly 'enableRdf'?:        boolean;
  readonly 'pipeline':          readonly string[];
  readonly 'output': {
    readonly 'directory': string;
    readonly 'files':     Record<string, string>;
  };
}

/** Schema-derived type for CLI config (validation shape from CliConfigSchema). */
export type CliConfigSchemaType = FromSchema<typeof CliConfigSchema>;
