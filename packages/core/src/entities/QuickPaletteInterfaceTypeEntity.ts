import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/**
 * Output shape of {@link import('../QuickPalette.ts').QuickPalette.resolve}: the
 * four canonical roles, each resolved to a 6-digit hex string.
 */
export namespace QuickPaletteInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'accent':     { 'type': 'string' },
      'background': { 'type': 'string' },
      'foreground': { 'type': 'string' },
      'muted':      { 'type': 'string' }
    },
    'required': ['accent', 'background', 'foreground', 'muted'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
