import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** Canonical role fields consumed by the resolved-role sort behaviors. */
export namespace RoleSortableRowInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/role-sortable-row',
    'additionalProperties': true,
    'properties': {
      'c': { 'type': 'number' },
      'compliance': { 'type': 'string' },
      'h': { 'type': 'number' },
      'hex': { 'type': 'string' },
      'l': { 'type': 'number' },
      'name': { 'type': 'string' },
      'ratio': { 'type': 'number' }
    },
    'required': ['c', 'compliance', 'h', 'hex', 'l', 'name', 'ratio'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & {
    'c': number;
    'compliance': string;
    'h': number;
    'hex': string;
    'l': number;
    'name': string;
    'ratio': number;
  };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
