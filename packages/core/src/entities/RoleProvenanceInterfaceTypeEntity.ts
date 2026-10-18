import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical provenance for one resolved role, including every color adjustment in resolution order. */
export namespace RoleProvenanceInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/role-provenance',
    'additionalProperties': false,
    'allOf': [{
      'if': {
        'properties': {
          'origin': { 'const': 'stated' }
        }
      },
      'then': {
        'properties': {
          'adjustments': { 'maxItems': 0 }
        }
      }
    }],
    'properties': {
      'adjustments': {
        'items': {
          'additionalProperties': false,
          'properties': {
            'afterHex':  { 'type': 'string' },
            'beforeHex': { 'type': 'string' },
            'operation': { 'enum': ['hue-target', 'role-range', 'contrast'] }
          },
          'required': ['afterHex', 'beforeHex', 'operation'],
          'type': 'object'
        },
        'type': 'array'
      },
      'origin': { 'enum': ['stated', 'derived', 'synthesized'] }
    },
    'required': ['adjustments', 'origin'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
