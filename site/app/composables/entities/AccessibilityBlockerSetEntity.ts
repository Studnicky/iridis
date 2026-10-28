import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** The blocked contrast pairs of one compliance report, ready for a toast: a sorted deterministic key, the standard label, and whether the engine withheld the palette. */
export namespace AccessibilityBlockerSetEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/accessibility-blocker-set',
    'additionalProperties': false,
    'properties': {
      'compliant': { 'type': 'boolean' },
      'key': { 'type': 'string' },
      'pairs': {
        'items': {
          'additionalProperties': false,
          'properties': {
            'actual': { 'type': 'number' },
            'background': { 'type': 'string' },
            'foreground': { 'type': 'string' },
            'id': { 'type': 'string' },
            'proofText': { 'type': 'string' },
            'required': { 'type': 'number' },
            'suffix': { 'type': 'string' }
          },
          'required': ['actual', 'background', 'foreground', 'id', 'proofText', 'required', 'suffix'],
          'type': 'object'
        },
        'type': 'array'
      },
      'standardLabel': { 'type': 'string' },
      'withheld': { 'type': 'boolean' }
    },
    'required': ['compliant', 'key', 'pairs', 'standardLabel', 'withheld'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
