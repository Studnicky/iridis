import type { JSONSchema7Type } from 'json-schema';

export interface MuiOutputInterface {
  readonly 'config':  string;
  readonly 'palette': Record<string, JSONSchema7Type>;
}
