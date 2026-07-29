import { InputSchema } from '@studnicky/iridis/model';

export const CliConfigSchema = {
  '$id': 'https://studnicky.dev/iridis-cli/CliConfig',
  'properties': {
    'enableCapacitor':  { 'type': 'boolean' },
    'enableContrast':   { 'type': 'boolean' },
    'enableImage':      { 'type': 'boolean' },
    'enableRdf':        { 'type': 'boolean' },
    'enableStylesheet': { 'type': 'boolean' },
    'enableTailwind':   { 'type': 'boolean' },
    'enableVscode':     { 'type': 'boolean' },
    'input': {
      'properties': {
        'colors': {
          'items': { 'type': 'string' },
          'minItems': 1,
          'type': 'array'
        },
        'contrast': {
          ...InputSchema.properties.contrast,
          'properties': {
            ...InputSchema.properties.contrast.properties,
            'extra': {
              'items': {
                'additionalProperties': false,
                'properties': {
                  'algorithm':  { 'enum': ['wcag21', 'apca'], 'type': 'string' },
                  'background': { 'type': 'string' },
                  'foreground': { 'type': 'string' },
                  'minRatio':   { 'type': 'number' }
                },
                'required': ['background', 'foreground', 'minRatio'],
                'type': 'object'
              },
              'type': 'array'
            }
          }
        },
        'metadata': {
          'type': 'object'
        },
        'roles': {
          'type': 'object'
        }
      },
      'required': ['colors'],
      'type': 'object'
    },
    'output': {
      'properties': {
        'directory': { 'type': 'string' },
        'files': {
          'additionalProperties': { 'type': 'string' },
          'type': 'object'
        }
      },
      'required': ['directory', 'files'],
      'type': 'object'
    },
    'pipeline': {
      'items': { 'type': 'string' },
      'minItems': 1,
      'type': 'array'
    }
  },
  'required': ['input', 'pipeline', 'output'],
  'type': 'object'
} as const;
