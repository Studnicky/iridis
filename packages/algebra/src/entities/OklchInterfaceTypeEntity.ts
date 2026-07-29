import type { FromSchema, JsonValueType } from '@studnicky/types';

import { JsonTology } from '@studnicky/json-tology';

/** OKLCH color: lightness, chroma, hue. */
export namespace OklchInterfaceTypeEntity {
  export const Schema = {
    '$id': 'urn:iridis-algebra:OklchInterfaceType',
    'additionalProperties': false,
    'properties': {
      'c': { 'type': 'number' },
      'h': { 'type': 'number' },
      'l': { 'type': 'number' }
    },
    'required': ['c', 'h', 'l'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const conforms = JsonTology.is(Schema, value);
    return conforms;
  };
}
