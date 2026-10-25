import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

import { CvdBlockedPairEntity } from './CvdBlockedPairEntity.ts';
import { CvdCorrectionEntity } from './CvdCorrectionEntity.ts';
import { CvdPairWarningEntity } from './CvdPairWarningEntity.ts';

export namespace CvdResultSetEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-contrast/CvdResultSet',
    'additionalProperties': false,
    'properties': {
      'blocked': {
        'items': CvdBlockedPairEntity.Schema,
        'type': 'array'
      },
      'corrections': {
        'items': CvdCorrectionEntity.Schema,
        'type': 'array'
      },
      'relationshipCandidateRejections': {
        'additionalProperties': {
          'minimum': 0,
          'type': 'integer'
        },
        'type': 'object'
      },
      'warnings': {
        'items': CvdPairWarningEntity.Schema,
        'type': 'array'
      }
    },
    'required': ['blocked', 'corrections', 'relationshipCandidateRejections', 'warnings'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake: ReturnType<typeof EntityCompiler.compileIntake<Type>> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: ReturnType<typeof EntityCompiler.compileCreate<Type>> = EntityCompiler.compileCreate<Type>(Schema);
}
