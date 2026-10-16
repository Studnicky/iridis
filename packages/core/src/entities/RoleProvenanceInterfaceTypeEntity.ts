import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** Canonical provenance for one resolved role, including every color adjustment in resolution order. */
export namespace RoleProvenanceInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'allOf': [{
      'if': {
        'properties': {
          'origin': { 'const': 'stated' }
        }
      },
      'then': {
        'properties': {
          'adjustments': { 'maxItems': 0 }
        }
      }
    }],
    'properties': {
      'adjustments': {
        'items': {
          'additionalProperties': false,
          'properties': {
            'afterHex':  { 'type': 'string' },
            'beforeHex': { 'type': 'string' },
            'operation': { 'enum': ['hue-target', 'role-range', 'contrast'] }
          },
          'required': ['afterHex', 'beforeHex', 'operation'],
          'type': 'object'
        },
        'type': 'array'
      },
      'origin': { 'enum': ['stated', 'derived', 'synthesized'] }
    },
    'required': ['adjustments', 'origin'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
