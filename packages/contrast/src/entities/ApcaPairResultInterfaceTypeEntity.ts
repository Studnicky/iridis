import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/** One APCA (WCAG 3 draft) contrast-pair enforcement result: before/after Lc against the required target. */
export namespace ApcaPairResultInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'afterLc':    { 'type': 'number' },
      'algorithm':  { 'enum': ['apca'], 'type': 'string' },
      'background': { 'type': 'string' },
      'beforeLc':   { 'type': 'number' },
      'foreground': { 'type': 'string' },
      'pass':       { 'type': 'boolean' },
      'requiredLc': { 'type': 'number' }
    },
    'required': ['afterLc', 'algorithm', 'background', 'beforeLc', 'foreground', 'pass', 'requiredLc'],
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
