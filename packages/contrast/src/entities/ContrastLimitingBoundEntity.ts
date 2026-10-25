import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/** One authored or emitted boundary that limits a contrast pair's reachability. */
export namespace ContrastLimitingBoundEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'channel': { 'enum': ['lightness', 'chroma', 'pin', 'gamut'], 'type': 'string' },
      'edge':    { 'enum': ['minimum', 'maximum', 'fixed'], 'type': 'string' },
      'role':    { 'type': 'string' },
      'value':   { 'type': 'number' }
    },
    'required': ['channel', 'edge', 'role', 'value'],
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
