import type { JSONSchema7Type } from 'json-schema';

export interface TailwindOutputInterface extends Record<string, JSONSchema7Type> {
  readonly 'colors':  Record<string, string | Record<string, string>>;
  readonly 'config':  string;
  readonly 'cssVars': string;
}
