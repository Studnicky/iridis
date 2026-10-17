import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** One role's absolute-hue-target override — see `core:hueTargetOverrides`. */
export namespace HueTargetOverrideInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'hue':      { 'type': 'number' },
      'hueClamp': { 'type': 'number' }
    },
    'required': ['hue'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
