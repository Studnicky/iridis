import type { JSONSchema7Type } from 'json-schema';

export interface CssVarsOutputInterface extends Record<string, JSONSchema7Type> {
  readonly 'darkScheme': string;
  readonly 'forcedColors': string;
  readonly 'full': string;
  readonly 'map': Record<string, string>;
  readonly 'rootBlock': string;
  readonly 'scopedBlock': string;
  readonly 'wideGamut': string;
}
