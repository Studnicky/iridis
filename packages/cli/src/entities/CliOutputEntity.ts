import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

export namespace CliOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-cli/CliOutput',
    'properties': {
      'directory': { 'type': 'string' },
      'files': {
        'additionalProperties': { 'type': 'string' },
        'type': 'object'
      }
    },
    'required': ['directory', 'files'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type | Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
