import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Runtime-validated vocabulary projection for RDF E2E scenarios. */
export namespace RdfPluginVocabScenarioEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'displayP3B': { 'type': 'string' },
      'displayP3G': { 'type': 'string' },
      'displayP3R': { 'type': 'string' },
      'hasColor': { 'type': 'string' },
      'hasRole': { 'type': 'string' },
      'hex': { 'type': 'string' },
      'oklchC': { 'type': 'string' },
      'oklchH': { 'type': 'string' },
      'oklchL': { 'type': 'string' },
      'rgbB': { 'type': 'string' },
      'rgbG': { 'type': 'string' },
      'rgbR': { 'type': 'string' },
      'role': { 'type': 'string' },
      'wcag21Ratio': { 'type': 'string' }
    },
    'required': [
      'displayP3B', 'displayP3G', 'displayP3R', 'hasColor', 'hasRole', 'hex',
      'oklchC', 'oklchH', 'oklchL', 'rgbB', 'rgbG', 'rgbR', 'role', 'wcag21Ratio'
    ],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
