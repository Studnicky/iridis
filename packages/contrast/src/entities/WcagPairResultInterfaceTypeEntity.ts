import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/** One WCAG 2.1 contrast-pair enforcement result: before/after ratios against the required minimum. */
export namespace WcagPairResultInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'after':      { 'type': 'number' },
      'algorithm':  { 'enum': ['wcag21', 'apca'], 'type': 'string' },
      'background': { 'type': 'string' },
      'before':     { 'type': 'number' },
      'foreground': { 'type': 'string' },
      'pass':       { 'type': 'boolean' },
      'required':   { 'type': 'number' }
    },
    'required': ['after', 'algorithm', 'background', 'before', 'foreground', 'pass', 'required'],
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
