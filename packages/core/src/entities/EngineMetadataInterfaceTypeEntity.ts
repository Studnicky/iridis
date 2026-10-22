import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ContrastReportInterfaceTypeEntity } from './ContrastReportInterfaceTypeEntity.ts';
import { HueTargetOverrideInterfaceTypeEntity } from './HueTargetOverrideInterfaceTypeEntity.ts';
import { RoleProvenanceInterfaceTypeEntity } from './RoleProvenanceInterfaceTypeEntity.ts';

/** Known `state.metadata` keys written by core tasks, and their runtime shapes. */
export namespace EngineMetadataInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'core:contrastReport': ContrastReportInterfaceTypeEntity.Schema,
      'core:hueOffsetOverrides': {
        'additionalProperties': { 'type': 'number' },
        'type': 'object'
      },
      'core:hueTargetOverrides': {
        'additionalProperties': HueTargetOverrideInterfaceTypeEntity.Schema,
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
        'additionalProperties': RoleProvenanceInterfaceTypeEntity.Schema,
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
