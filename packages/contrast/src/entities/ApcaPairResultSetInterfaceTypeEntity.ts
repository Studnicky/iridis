import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

import { ApcaPairResultInterfaceTypeEntity } from './ApcaPairResultInterfaceTypeEntity.ts';

export namespace ApcaPairResultSetInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-contrast/ApcaPairResultSet',
    'additionalProperties': false,
    'properties': {
      'pairs': {
        'items': ApcaPairResultInterfaceTypeEntity.Schema,
        'type': 'array'
      }
    },
    'required': ['pairs'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
