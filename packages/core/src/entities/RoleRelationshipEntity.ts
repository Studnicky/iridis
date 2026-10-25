import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { RelationshipToleranceEntity } from './RelationshipToleranceEntity.ts';

const sharedProperties = {
  'id': { 'minLength': 1, 'type': 'string' },
  'priority': { 'minimum': 0, 'type': 'integer' },
  'relaxability': {
    'description': 'fixed preserves the relation exactly; tolerant permits only its declared tolerance.',
    'enum': ['fixed', 'tolerant'],
    'type': 'string'
  },
  'tolerance': RelationshipToleranceEntity.Schema
} as const;

const relaxabilityConstraint = {
  'oneOf': [
    {
      'not': { 'required': ['tolerance'] },
      'properties': { 'relaxability': { 'const': 'fixed' } },
      'required': ['relaxability']
    },
    {
      'properties': { 'relaxability': { 'const': 'tolerant' } },
      'required': ['relaxability', 'tolerance']
    }
  ]
} as const;

/** One authored operation that derives a target role from one or more source roles. */
export namespace RoleRelationshipEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/role-relationship',
    'oneOf': [
      {
        'additionalProperties': false,
        'allOf': [relaxabilityConstraint],
        'properties': {
          ...sharedProperties,
          'operation': { 'const': 'alias', 'type': 'string' },
          'source': { 'minLength': 1, 'type': 'string' },
          'target': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['id', 'operation', 'priority', 'relaxability', 'source', 'target'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'allOf': [relaxabilityConstraint],
        'properties': {
          ...sharedProperties,
          'clamp': { 'maximum': 180, 'minimum': 0, 'type': 'number' },
          'hue': { 'maximum': 360, 'minimum': 0, 'type': 'number' },
          'operation': { 'const': 'hue-target', 'type': 'string' },
          'source': { 'minLength': 1, 'type': 'string' },
          'target': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['hue', 'id', 'operation', 'priority', 'relaxability', 'target'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'allOf': [
          relaxabilityConstraint,
          {
            'oneOf': [
              {
                'not': { 'anyOf': [{ 'required': ['modeId'] }, { 'required': ['variantId'] }] },
                'required': ['degrees']
              },
              {
                'not': { 'required': ['degrees'] },
                'required': ['variantId']
              }
            ]
          }
        ],
        'properties': {
          ...sharedProperties,
          'degrees': { 'maximum': 360, 'minimum': -360, 'type': 'number' },
          'modeId': { 'minLength': 1, 'type': 'string' },
          'operation': { 'const': 'hue-offset', 'type': 'string' },
          'source': { 'minLength': 1, 'type': 'string' },
          'target': { 'minLength': 1, 'type': 'string' },
          'variantId': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['id', 'operation', 'priority', 'relaxability', 'source', 'target'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'allOf': [
          relaxabilityConstraint,
          {
            'anyOf': [
              { 'required': ['chromaScale'] },
              { 'required': ['hueOffset'] },
              { 'required': ['lightnessOffset'] }
            ]
          }
        ],
        'properties': {
          ...sharedProperties,
          'chromaScale': { 'minimum': 0, 'type': 'number' },
          'hueOffset': { 'maximum': 360, 'minimum': -360, 'type': 'number' },
          'lightnessOffset': { 'maximum': 1, 'minimum': -1, 'type': 'number' },
          'operation': { 'const': 'oklch-delta', 'type': 'string' },
          'source': { 'minLength': 1, 'type': 'string' },
          'target': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['id', 'operation', 'priority', 'relaxability', 'source', 'target'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'allOf': [relaxabilityConstraint],
        'properties': {
          ...sharedProperties,
          'operation': { 'const': 'oklch-interpolate', 'type': 'string' },
          'source': { 'minLength': 1, 'type': 'string' },
          'target': { 'minLength': 1, 'type': 'string' },
          'toward': { 'minLength': 1, 'type': 'string' },
          'weight': { 'maximum': 1, 'minimum': 0, 'type': 'number' }
        },
        'required': ['id', 'operation', 'priority', 'relaxability', 'source', 'target', 'toward', 'weight'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'allOf': [relaxabilityConstraint],
        'properties': {
          ...sharedProperties,
          'alpha': { 'maximum': 1, 'minimum': 0, 'type': 'number' },
          'base': { 'minLength': 1, 'type': 'string' },
          'operation': { 'const': 'alpha-overlay', 'type': 'string' },
          'overlay': { 'minLength': 1, 'type': 'string' },
          'target': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['alpha', 'base', 'id', 'operation', 'overlay', 'priority', 'relaxability', 'target'],
        'type': 'object'
      }
    ]
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
