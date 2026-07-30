import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Guard } from '@studnicky/types';

const FONT_STYLE_VALUES = ['bold', 'bold italic', 'italic', 'strikethrough', 'underline'] as const;
const FONT_STYLE_VALUE_SET: ReadonlySet<string> = new Set(FONT_STYLE_VALUES);

/**
 * Per-modifier delta applied on top of a token's base color: lightness,
 * saturation, mix-toward-role weight, and font style.
 */
export namespace ModifierTransformInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'fontStyle':  { 'enum': FONT_STYLE_VALUES },
      'lightness':  { 'type': 'number' },
      'mixWeight':  { 'type': 'number' },
      'mixWith':    { 'type': 'string' },
      'saturation': { 'type': 'number' }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (candidate: JsonValueType): candidate is Type => {
    if (!Guard.isObject(candidate)) {return false;}
    const fontStyleValid  = candidate.fontStyle === undefined
      || (typeof candidate.fontStyle === 'string' && FONT_STYLE_VALUE_SET.has(candidate.fontStyle));
    const lightnessValid  = candidate.lightness === undefined || typeof candidate.lightness === 'number';
    const mixWeightValid  = candidate.mixWeight === undefined || typeof candidate.mixWeight === 'number';
    const mixWithValid    = candidate.mixWith === undefined || typeof candidate.mixWith === 'string';
    const saturationValid = candidate.saturation === undefined || typeof candidate.saturation === 'number';
    return fontStyleValid && lightnessValid && mixWeightValid && mixWithValid && saturationValid;
  };
}
