import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical output emitted at `outputs['shadcn:theme']`. */
export namespace ShadcnOutputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/shadcn/theme-output',
    'additionalProperties': false,
    'properties': {
      'colors':  { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
      'cssVars': { 'type': 'string' }
    },
    'required': ['colors', 'cssVars'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
