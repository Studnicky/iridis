import type { FromSchema, JsonValueType } from '@studnicky/types';

import { JsonTology } from '@studnicky/json-tology';

/** Options controlling {@link LerpHue}'s sweep direction around the hue circle. */
export namespace LerpOptionsInterfaceTypeEntity {
  export const Schema = {
    '$id': 'urn:iridis-algebra:LerpOptionsInterfaceType',
    'additionalProperties': false,
    'properties': {
      'hueDirection': { 'enum': ['clockwise', 'counterClockwise', 'shortestArc'] }
    },
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const conforms = JsonTology.is(Schema, value);
    return conforms;
  };
}
