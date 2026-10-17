import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis';

/** Tailwind `theme.colors` shape: role name to hex string, or shade root to a `{shade: hex}` scale. */
export namespace ColorsShapeRecordEntity {
  export const Schema = {
    'additionalProperties': {
      'oneOf': [
        { 'type': 'string' },
        {
          'additionalProperties': { 'type': 'string' },
          'type': 'object'
        }
      ]
    },
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
