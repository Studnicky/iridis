import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Bounded OKLCH and alpha deviation that compliance may apply to a tolerant relationship. */
export namespace RelationshipToleranceEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/relationship-tolerance',
    'additionalProperties': false,
    'minProperties': 1,
    'properties': {
      'alpha': { 'maximum': 1, 'minimum': 0, 'type': 'number' },
      'chroma': { 'maximum': 0.5, 'minimum': 0, 'type': 'number' },
      'hue': { 'maximum': 360, 'minimum': 0, 'type': 'number' },
      'lightness': { 'maximum': 1, 'minimum': 0, 'type': 'number' }
    },
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
