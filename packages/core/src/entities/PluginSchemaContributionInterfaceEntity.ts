import type { FromSchema } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** A JSON Schema object contributed by a plugin for output/metadata slot validation. */
export namespace PluginSchemaContributionInterfaceEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'metadata': { 'type': 'object' },
      'outputs':  { 'type': 'object' }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: object): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
