export const InputSchema = {
  '$id':      'https://studnicky.dev/iridis/Input',
  'type':     'object',
  'required': ['colors'],
  'properties': {
    'colors': {
      'type': 'array',
    },
    'roles': {
      'type': 'object',
    },
    'contrast': {
      'type': 'object',
      'properties': {
        'level':     { 'type': 'string' },
        'algorithm': { 'type': 'string' },
        'extra':     { 'type': 'array' },
      },
    },
    'maxColors': { 'type': 'number' },
    'bypass':    { 'type': 'boolean' },
    'emit': {
      'type':  'array',
      'items': { 'type': 'string' },
    },
    'runtime': {
      'type': 'object',
    },
    'metadata': {
      'type': 'object',
    },
  },
} as const;
