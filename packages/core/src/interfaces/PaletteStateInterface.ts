import type { JsonObjectType } from '@studnicky/types';

import type { ColorRecordInterfaceType } from '../types/color.ts';
import type { InputInterface } from './InputInterface.ts';
import type { RuntimeOptionsInterface } from './RuntimeOptionsInterface.ts';

export interface PaletteStateInterface {
  'colors':            ColorRecordInterfaceType[];
  readonly 'input':    InputInterface;
  'metadata':          JsonObjectType;
  'outputs':           JsonObjectType;
  'roles':             Record<string, ColorRecordInterfaceType>;
  readonly 'runtime':  RuntimeOptionsInterface;
  'variants':          Record<string, Record<string, ColorRecordInterfaceType>>;
}
