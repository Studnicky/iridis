import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ContrastReportEntity } from './ContrastReportEntity.ts';
import { HueTargetOverrideEntity } from './HueTargetOverrideEntity.ts';
import { RelationshipResolutionEntity } from './RelationshipResolutionEntity.ts';
import { RoleProvenanceEntity } from './RoleProvenanceEntity.ts';

/** Known `state.metadata` keys written by core tasks, and their runtime shapes. */
export namespace EngineMetadataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'core:contrastReport': ContrastReportEntity.Schema,
      'core:hueOffsetOverrides': {
        'additionalProperties': { 'type': 'number' },
        'type': 'object'
      },
      'core:hueTargetOverrides': {
        'additionalProperties': HueTargetOverrideEntity.Schema,
        'type': 'object'
      },
      'core:relationshipResolution': {
        'additionalProperties': RelationshipResolutionEntity.Schema,
        'type': 'object'
      },
      'core:roleDistances': {
        'additionalProperties': {
          'additionalProperties': { 'type': 'number' },
          'type': 'object'
        },
        'type': 'object'
      },
      'core:roleProvenance': {
        'additionalProperties': RoleProvenanceEntity.Schema,
        'type': 'object'
      }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> =
    EntityCompiler.compileCreate<Type>(Schema);
}
