import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** Schema-authored definition of one palette role: ranges, hue targeting, and semantic intent. */
export namespace RoleDefinitionInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'chromaRange':    {
        'items': { 'type': 'number' },
        'maxItems': 2,
        'minItems': 2,
        'type': 'array'
      },
      'derivedFrom':    { 'type': 'string' },
      'description':    { 'type': 'string' },
      'hue':            { 'type': 'number' },
      'hueClamp':       { 'type': 'number' },
      'hueOffset':      { 'type': 'number' },
      'intent': {
        'enum': [
          'text',
          'background',
          'accent',
          'muted',
          'critical',
          'positive',
          'link',
          'button',
          'onAccent',
          'onButton'
        ]
      },
      'lightnessRange': {
        'items': { 'type': 'number' },
        'maxItems': 2,
        'minItems': 2,
        'type': 'array'
      },
      'name':           { 'type': 'string' },
      'required':       { 'type': 'boolean' }
    },
    'required': ['name'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
