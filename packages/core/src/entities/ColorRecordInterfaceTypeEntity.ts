import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';
import { ColorHintsInterfaceTypeEntity } from './ColorHintsInterfaceTypeEntity.ts';
import { OklchInterfaceTypeEntity } from './OklchInterfaceTypeEntity.ts';
import { RgbInterfaceTypeEntity } from './RgbInterfaceTypeEntity.ts';

/** Canonical color record: OKLCH, sRGB, hex, alpha, source format, wide-gamut, and hint metadata. */
export namespace ColorRecordInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'alpha':        { 'type': 'number' },
      'displayP3':    RgbInterfaceTypeEntity.Schema,
      'hex':          { 'type': 'string' },
      'hints':        ColorHintsInterfaceTypeEntity.Schema,
      'oklch':        OklchInterfaceTypeEntity.Schema,
      'rgb':          RgbInterfaceTypeEntity.Schema,
      'sourceFormat': {
        'enum': [
          'hex',
          'rgb',
          'hsl',
          'oklch',
          'lab',
          'named',
          'imagePixel',
          'displayP3'
        ]
      }
    },
    'required': ['alpha', 'hex', 'oklch', 'rgb', 'sourceFormat'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
