import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ColorHintsInterfaceTypeEntity } from './ColorHintsInterfaceTypeEntity.ts';
import { OklchInterfaceTypeEntity } from './OklchInterfaceTypeEntity.ts';
import { RgbInterfaceTypeEntity } from './RgbInterfaceTypeEntity.ts';

/** Canonical color record: OKLCH, sRGB, hex, alpha, source format, wide-gamut, and hint metadata. */
export namespace ColorRecordInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/color-record',
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

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
