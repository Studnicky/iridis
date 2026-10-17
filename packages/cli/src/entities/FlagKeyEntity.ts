import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/** One of the `CliConfigEntity` boolean flags that gates loading an optional plugin package. */
export namespace FlagKeyEntity {
  export const Schema = {
    'enum': [
      'enableCapacitor',
      'enableContrast',
      'enableImage',
      'enableRdf',
      'enableStylesheet',
      'enableTailwind',
      'enableVscode'
    ],
    'type': 'string'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
