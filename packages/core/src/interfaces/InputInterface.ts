import type { JsonObjectType, JsonValueType } from '@studnicky/types';

import type { RoleSchemaInterfaceType } from '../types/role.ts';
import type { ContrastOptionsInterfaceType } from '../types/state.ts';
import type { RawImagePixelInputInterface } from './RawImagePixelInputInterface.ts';
import type { RuntimeOptionsInterface } from './RuntimeOptionsInterface.ts';

export interface InputInterface {
  readonly 'bypass':    boolean | undefined;
  readonly 'colors':    readonly (JsonValueType | RawImagePixelInputInterface)[];
  readonly 'contrast':  ContrastOptionsInterfaceType | undefined;
  /**
   * Selective emit filter: names of output slots to produce. Reserved for
   * the planned `@studnicky/iridis-anima` animation/interpolation engine,
   * which will use this field to request only the output slots it needs per
   * interpolation frame (avoiding unnecessary emit work on hot paths).
   * No current task reads this field; it is public API for future consumers.
   */
  readonly 'emit':      readonly string[] | undefined;
  readonly 'maxColors': number | undefined;
  readonly 'metadata':  JsonObjectType | undefined;
  readonly 'roles':     RoleSchemaInterfaceType | undefined;
  readonly 'runtime':   RuntimeOptionsInterface | undefined;
}
