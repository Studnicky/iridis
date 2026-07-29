import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Guard } from '@studnicky/types';

/** A single VS Code semantic token rule: `{ fontStyle?, foreground? }`. */
export namespace SemanticRuleEntryInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'fontStyle':  { 'type': 'string' },
      'foreground': { 'type': 'string' }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (candidate: JsonValueType): candidate is Type => {
    if (!Guard.isObject(candidate)) {return false;}
    const fontStyleValid  = candidate.fontStyle === undefined || typeof candidate.fontStyle === 'string';
    const foregroundValid = candidate.foreground === undefined || typeof candidate.foreground === 'string';
    return fontStyleValid && foregroundValid;
  };
}
