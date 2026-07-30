import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

import { CvdCorrectionInterfaceTypeEntity } from './CvdCorrectionInterfaceTypeEntity.ts';
import { CvdPairWarningInterfaceTypeEntity } from './CvdPairWarningInterfaceTypeEntity.ts';

export namespace CvdResultSetInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-contrast/CvdResultSet',
    'additionalProperties': false,
    'properties': {
      'corrections': {
        'items': CvdCorrectionInterfaceTypeEntity.Schema,
        'type': 'array'
      },
      'warnings': {
        'items': CvdPairWarningInterfaceTypeEntity.Schema,
        'type': 'array'
      }
    },
    'required': ['warnings'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema> & {
    'corrections': CvdCorrectionInterfaceTypeEntity.Type[] | undefined;
  };

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
