import type { InputInterface } from '@studnicky/iridis/model';
import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

import { CliConfigSchema } from '../CliConfigSchema.ts';

/**
 * Schema-derived CLI config type. `input` is a full nested
 * {@link InputInterface} — the schema below still validates it at runtime
 * (required `colors`, non-empty arrays, etc.) so `ConfigLoader` keeps
 * rejecting malformed input up front, but the schema's own inferred shape
 * for that key is narrower than the real interface, so `Type` omits it and
 * widens back to `InputInterface` via intersection.
 */
export namespace CliConfigEntity {
  export const Schema = { ...CliConfigSchema } as const;

  export type Type = FromSchema<typeof Schema> & { 'input': InputInterface };

  export const validate = (value: JsonValueType | object | Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
