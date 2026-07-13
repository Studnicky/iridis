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
          'properties': {
            'algorithm': { 'type': 'string' },
            'level': { 'type': 'string' }
          },
          'type': 'object'
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
