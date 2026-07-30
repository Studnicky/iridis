import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/**
 * Mirrors the private `shadcnOutputSchema` declared in
 * `../../src/ShadcnPlugin.ts` (not exported — the schema shape is the
 * public output contract via `outputs['shadcn:theme']`, so this test
 * entity re-declares the same shape rather than reaching into src).
 * `colors.additionalProperties` is narrowed from the production schema's
 * lenient `true` to `{ 'type': 'string' }` so `FromSchema` derives the
 * real runtime shape (`Record<string, string>`, matching
 * `ShadcnOutputInterfaceType.colors`) instead of an untyped object —
 * strictly stronger validation that never rejects valid production output.
 */
export namespace ShadcnThemeScenarioOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-shadcn/tests/ShadcnThemeScenarioOutput',
    'additionalProperties': false,
    'properties': {
      'colors':  { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
      'cssVars': { 'type': 'string' }
    },
    'required': ['colors', 'cssVars'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
