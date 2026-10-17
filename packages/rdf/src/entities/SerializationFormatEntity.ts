import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/** RDF serialization format accepted by `reason:serialize`, matching n3's `Writer` format option. */
export namespace SerializationFormatEntity {
  export const Schema = {
    'enum': ['Turtle', 'TriG', 'N-Quads', 'application/ld+json']
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
