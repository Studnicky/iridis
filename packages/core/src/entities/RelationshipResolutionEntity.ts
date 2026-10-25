import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ColorRecordEntity } from './ColorRecordEntity.ts';
import { RelationshipToleranceEntity } from './RelationshipToleranceEntity.ts';

/** Exact relationship baseline and provenance for one target role. */
export namespace RelationshipResolutionEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/relationship-resolution',
    'additionalProperties': false,
    'properties': {
      'after': ColorRecordEntity.Schema,
      'before': ColorRecordEntity.Schema,
      'blockedReason': {
        'enum': ['cycle', 'missing-source', 'relation-tolerance', 'stated-target'],
        'type': 'string'
      },
      'deviation': RelationshipToleranceEntity.Schema,
      'disposition': {
        'enum': ['applied', 'preserved-stated', 'relation-tolerance', 'unresolved'],
        'type': 'string'
      },
      'groupId': { 'minLength': 1, 'type': 'string' },
      'modeId': { 'minLength': 1, 'type': 'string' },
      'operation': {
        'enum': ['alias', 'alpha-overlay', 'hue-offset', 'hue-target', 'oklch-delta', 'oklch-interpolate'],
        'type': 'string'
      },
      'relationshipId': { 'minLength': 1, 'type': 'string' },
      'sources': {
        'items': { 'minLength': 1, 'type': 'string' },
        'type': 'array'
      },
      'variantId': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['disposition', 'groupId', 'operation', 'relationshipId', 'sources'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
