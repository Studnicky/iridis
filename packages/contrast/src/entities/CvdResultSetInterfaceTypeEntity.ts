import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
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

  export type Type = InferType<typeof Schema> & {
    'corrections': CvdCorrectionInterfaceTypeEntity.Type[];
  };

  export const validate = (value: JSONSchema7Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
