import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Guard } from '@studnicky/types';

import { DerivationParametersSchema } from '../DerivationParametersSchema.ts';

/** Hue/lightness/saturation deltas applied to derive a token type from its family root color. */
export namespace DerivationParametersInterfaceTypeEntity {
  export const Schema = { ...DerivationParametersSchema, 'required': [] } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (candidate: JsonValueType): candidate is Type => {
    if (!Guard.isObject(candidate)) {return false;}
    const hueValid   = candidate.hue === undefined || typeof candidate.hue === 'number';
    const lightValid = candidate.light === undefined || typeof candidate.light === 'number';
    const satValid   = candidate.sat === undefined || typeof candidate.sat === 'number';
    return hueValid && lightValid && satValid;
  };
}
