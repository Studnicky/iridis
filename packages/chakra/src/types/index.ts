import type { JSONSchema7Type } from 'json-schema';

export abstract class ChakraOutputInterfaceType {
  [key: string]: JSONSchema7Type;

  abstract 'colors': Record<string, Record<string, string>>;
  abstract 'config': string;
}

export type * from './augmentation.ts';
