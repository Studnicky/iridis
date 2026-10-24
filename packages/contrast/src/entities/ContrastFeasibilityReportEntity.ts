import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

import { ContrastPairFeasibilityEntity } from './ContrastPairFeasibilityEntity.ts';

/** Schema-author reachability advisory for all declared contrast pairs. */
export namespace ContrastFeasibilityReportEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'pairs': {
        'items': ContrastPairFeasibilityEntity.Schema,
        'type': 'array'
      }
    },
    'required': ['pairs'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type): value is Type => {
    const validation = new Validator().validate(Schema, value);
    const result = validation.errors.length === 0;
    return result;
  };
  export const intake: ReturnType<typeof EntityCompiler.compileIntake<Type>> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: ReturnType<typeof EntityCompiler.compileCreate<Type>> = EntityCompiler.compileCreate<Type>(Schema);
}
