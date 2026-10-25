import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { DerivationParametersSchema } from '../DerivationParametersSchema.ts';

/** Hue/lightness/saturation deltas applied to derive a token type from its family root color. */
export namespace DerivationParametersEntity {
  export const Schema = { ...DerivationParametersSchema, 'required': [] } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
