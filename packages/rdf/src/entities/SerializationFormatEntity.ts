import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/** RDF serialization format accepted by `reason:serialize`, matching n3's `Writer` format option. */
export namespace SerializationFormatEntity {
  export const Schema = {
    'enum': ['Turtle', 'TriG', 'N-Quads', 'application/ld+json']
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
