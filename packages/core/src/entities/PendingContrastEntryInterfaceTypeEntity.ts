import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';
import { ContrastPairInterfaceTypeEntity } from './ContrastPairInterfaceTypeEntity.ts';

/** A contrast pair queued during the nudge pass, held until reconciliation re-measures it against the terminal state.roles. */
export namespace PendingContrastEntryInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'adjusted':              { 'type': 'boolean' },
      'adjustmentDisposition': { 'enum': ['not-needed', 'applied', 'preserved-stated', 'unresolved'] },
      'algo':                  { 'enum': ['wcag21', 'apca'] },
      'maxRatio': { 'maximum': 21, 'minimum': 1, 'type': 'number' },
      'minRatio': { 'maximum': 21, 'minimum': 1, 'type': 'number' },
      'pair':     ContrastPairInterfaceTypeEntity.Schema
    },
    'required': ['adjusted', 'adjustmentDisposition', 'algo', 'minRatio', 'pair'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
