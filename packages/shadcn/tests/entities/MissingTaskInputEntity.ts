import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/**
 * Scenario input for cell 7 (missing-prerequisite-task): the pipeline task
 * names handed to `engine.pipeline()` when `shadcnPlugin` was never
 * adopted onto the engine.
 */
export namespace MissingTaskInputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-shadcn/tests/MissingTaskInput',
    'additionalProperties': false,
    'properties': {
      'pipelineNames': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': ['pipelineNames'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
