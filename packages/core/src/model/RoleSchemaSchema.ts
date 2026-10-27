import { ContrastPairEntity } from '../entities/ContrastPairEntity.ts';

export const RoleSchemaSchema = {
  '$id':       'https://studnicky.dev/iridis/RoleSchema',
  'additionalProperties': false,
  'properties': {
    'contrastPairs': {
      'items': ContrastPairEntity.Schema,
      'type':  'array'
    },
    'description': { 'type': 'string' },
    'name':        { 'type': 'string' },
    'relationshipGraph': { 'type': 'object' },
    'roles': {
      'items': {
        'additionalProperties': false,
        'properties': {
          'chromaRange': {
            'items':    { 'maximum': 0.5, 'minimum': 0, 'type': 'number' },
            'maxItems': 2,
            'minItems': 2,
            'type':     'array'
          },
          'description': { 'type': 'string' },
          'intent': {
            'enum': ['text', 'background', 'accent', 'muted', 'critical', 'positive', 'link', 'button', 'onAccent', 'onButton'],
            'type': 'string'
          },
          'lightnessRange': {
            'items':    { 'maximum': 1, 'minimum': 0, 'type': 'number' },
            'maxItems': 2,
            'minItems': 2,
            'type':     'array'
          },
          'name':        { 'type': 'string' },
          'required':       { 'type': 'boolean' }
        },
        'required': ['name'],
        'type':     'object'
      },
      'type':     'array'
    }
  },
  'required':  ['name', 'roles'],
  'type':      'object'
} as const;
