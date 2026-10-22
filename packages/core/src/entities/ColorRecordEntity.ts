import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ColorHintsEntity } from './ColorHintsEntity.ts';
import { OklchEntity } from './OklchEntity.ts';
import { RgbEntity } from './RgbEntity.ts';

/** Canonical color record: OKLCH, sRGB, hex, alpha, source format, wide-gamut, and hint metadata. */
export namespace ColorRecordEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/color-record',
    'additionalProperties': false,
    'properties': {
      'alpha':        { 'type': 'number' },
      'displayP3':    RgbEntity.Schema,
      'hex':          { 'type': 'string' },
      'hints':        ColorHintsEntity.Schema,
      'oklch':        OklchEntity.Schema,
      'rgb':          RgbEntity.Schema,
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

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
