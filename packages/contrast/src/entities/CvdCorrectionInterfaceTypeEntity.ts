import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/** One CVD auto-correction record: which failing deficiency types were cleared for a pair and which remain. */
export namespace CvdCorrectionInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'background':        { 'type': 'string' },
      'cvdTypesFixed':     { 'items': { 'type': 'string' }, 'type': 'array' },
      'cvdTypesRemaining': { 'items': { 'type': 'string' }, 'type': 'array' },
      'foreground':        { 'type': 'string' }
    },
    'required': ['background', 'cvdTypesFixed', 'cvdTypesRemaining', 'foreground'],
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
