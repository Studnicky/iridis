import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/**
 * Scenario output for cell 7 (missing-prerequisite-task). The runner
 * always throws before this shape would be constructed for real — it
 * exists only to satisfy `ScenarioInterface<TInput, TOutput>`'s output
 * type parameter.
 */
export namespace MissingTaskOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-shadcn/tests/MissingTaskOutput',
    'additionalProperties': false,
    'properties': {
      'pipelined': { 'type': 'boolean' }
    },
    'required': ['pipelined'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
