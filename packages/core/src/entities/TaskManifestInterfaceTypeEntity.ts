import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** Declarative pipeline-task manifest: name, lifecycle phase, and read/write/require slots. */
export namespace TaskManifestInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'type': 'string' },
      'name':        { 'type': 'string' },
      'phase':       { 'enum': ['onRunStart', 'onRunEnd'] },
      'reads':       { 'items': { 'type': 'string' }, 'type': 'array' },
      'requires':    { 'items': { 'type': 'string' }, 'type': 'array' },
      'writes':      { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': ['name'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
