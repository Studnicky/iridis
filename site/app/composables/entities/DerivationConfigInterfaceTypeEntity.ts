import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { DerivationRelationInterfaceTypeEntity } from './DerivationRelationInterfaceTypeEntity.ts';

export namespace DerivationConfigInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/derivation-config',
    'additionalProperties': false,
    'properties': {
      'relations': {
        'additionalProperties': DerivationRelationInterfaceTypeEntity.Schema,
        'type': 'object'
      }
    },
    'required': ['relations'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'relations': Record<string, DerivationRelationInterfaceTypeEntity.Type> };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
  export const defaultValue = create({ 'relations': {} });
}
