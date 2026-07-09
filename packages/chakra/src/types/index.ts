export interface ChakraOutputInterface {
  readonly 'colors': Record<string, Record<string, string>>;
  readonly 'config': string;
}

export type * from './augmentation.ts';
