import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

// Mirrors the real `chakraOutputSchema` shape declared in
// `ChakraPlugin.ts` (`{ colors: object, config: string }`,
// `additionalProperties: false`), with `colors` narrowed from the
// production schema's bare `additionalProperties: true` to a nested
// tier-map shape — every value EmitChakraTheme actually writes satisfies
// this narrower shape too, and it gives assertions typed access to
// `colors[family][tier]` without a cast.
const CHAKRA_THEME_OUTPUT_SCHEMA = {
  'additionalProperties': false,
  'properties': {
    'colors': {
      'additionalProperties': { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
      'type': 'object'
    },
    'config': { 'type': 'string' }
  },
  'required': ['colors', 'config'],
  'type': 'object'
} as const;

export namespace ChakraThemeScenarioOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-chakra/tests/ChakraThemeScenarioOutput',
    'additionalProperties': false,
    'properties': {
      'theme': CHAKRA_THEME_OUTPUT_SCHEMA
    },
    'required': ['theme'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
