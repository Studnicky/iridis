import type { JSONSchema7Type } from 'json-schema';

export interface CssVarsScopedOutputInterface extends Record<string, JSONSchema7Type> {
  readonly 'blocks': Record<string, string>;
  readonly 'full': string;
  readonly 'wideGamut': Record<string, string>;
}
