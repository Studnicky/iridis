export const CliConfigSchema = {
  '$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'required': ['input', 'pipeline', 'output'],
  'properties': {
    'input': {
      'type': 'object',
      'required': ['colors'],
      'properties': {
        'colors': {
          'type': 'array',
          'items': { 'type': 'string' },
          'minItems': 1
        },
        'roles': {
          'type': 'object'
        },
        'contrast': {
          'type': 'object',
          'properties': {
            'level': { 'type': 'string' },
            'algorithm': { 'type': 'string' }
          }
        },
        'metadata': {
          'type': 'object'
        }
      }
    },
    'enableVscode':     { 'type': 'boolean' },
    'enableStylesheet': { 'type': 'boolean' },
    'enableTailwind':   { 'type': 'boolean' },
    'enableImage':      { 'type': 'boolean' },
    'enableContrast':   { 'type': 'boolean' },
    'enableCapacitor':  { 'type': 'boolean' },
    'enableRdf':        { 'type': 'boolean' },
    'pipeline': {
      'type': 'array',
      'items': { 'type': 'string' },
      'minItems': 1
    },
    'output': {
      'type': 'object',
      'required': ['directory', 'files'],
      'properties': {
        'directory': { 'type': 'string' },
        'files': {
          'type': 'object',
          'additionalProperties': { 'type': 'string' }
        }
      }
    }
  }
} as const;
