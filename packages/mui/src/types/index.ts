import type { JsonValueType } from '@studnicky/types';

export type MuiOutputInterfaceType = {
  'config':  string;
  'palette': Record<string, JsonValueType>;
};

export type * from './augmentation.ts';
