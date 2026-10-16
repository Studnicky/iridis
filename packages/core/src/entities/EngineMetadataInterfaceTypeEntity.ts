import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';
import { HueTargetOverrideInterfaceTypeEntity } from './HueTargetOverrideInterfaceTypeEntity.ts';
import { RoleProvenanceInterfaceTypeEntity } from './RoleProvenanceInterfaceTypeEntity.ts';

/** Known `state.metadata` keys written by core tasks, and their runtime shapes. */
export namespace EngineMetadataInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
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

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
