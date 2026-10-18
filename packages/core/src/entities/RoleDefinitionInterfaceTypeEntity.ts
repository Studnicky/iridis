import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Schema-authored definition of one palette role: ranges, hue targeting, and semantic intent. */
export namespace RoleDefinitionInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/role-definition',
    'additionalProperties': false,
    'properties': {
      'chromaRange':    {
        'items': { 'type': 'number' },
        'maxItems': 2,
        'minItems': 2,
        'type': 'array'
      },
      'chromaScale':    { 'minimum': 0, 'type': 'number' },
      'derivedFrom':    { 'type': 'string' },
      'description':    { 'type': 'string' },
      'hue':            { 'type': 'number' },
      'hueClamp':       { 'type': 'number' },
      'hueOffset':      { 'type': 'number' },
      'intent': {
        'enum': [
          'text',
          'background',
          'accent',
          'muted',
          'critical',
          'positive',
          'link',
          'button',
          'onAccent',
          'onButton'
        ]
      },
      'lightnessOffset': { 'maximum': 1, 'minimum': -1, 'type': 'number' },
      'lightnessRange': {
        'items': { 'type': 'number' },
        'maxItems': 2,
        'minItems': 2,
        'type': 'array'
      },
      'name':           { 'type': 'string' },
      'required':       { 'type': 'boolean' }
    },
    'required': ['name'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
