import type { ColorRecordInterface } from './color.ts';
import type {
  ContrastAlgorithmType,
  ContrastPairInterface,
  RoleSchemaInterface,
} from './role.ts';
import type { RuntimeOptionsInterface } from './runtime.ts';

export interface InputInterface {
  readonly colors:    readonly unknown[];
  readonly roles?:    RoleSchemaInterface;
  readonly contrast?: {
    readonly level?:     'AA' | 'AAA' | string;
    readonly algorithm?: ContrastAlgorithmType;
    readonly extra?:     readonly ContrastPairInterface[];
  };
  readonly maxColors?: number;
  readonly bypass?:    boolean;
  readonly emit?:      readonly string[];
  readonly runtime?:   RuntimeOptionsInterface;
  readonly metadata?:  Record<string, unknown>;
}

export interface PaletteStateInterface {
  readonly input:    InputInterface;
  readonly runtime:  RuntimeOptionsInterface;
  colors:            ColorRecordInterface[];
  roles:             Record<string, ColorRecordInterface>;
  variants:          Record<string, Record<string, ColorRecordInterface>>;
  outputs:           Record<string, unknown>;
  graph?:            unknown;
  metadata:          Record<string, unknown>;
}
