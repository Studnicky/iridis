export const InputSchema = {
  '$id':                'https://studnicky.dev/iridis/Input',
  'additionalProperties': false,
  'properties': {
    'bypass':    { 'type': 'boolean' },
    'colors':     { 'type': 'array' },
    'contrast': {
      'additionalProperties': false,
      'properties': {
        'algorithm': { 'enum': ['wcag21', 'apca'], 'type': 'string' },
        'extra':     { 'type': 'array' },
        'level':     { 'type': 'string' }
      },
      'type': 'object'
    },
    'emit': {
      'items': { 'type': 'string' },
      'type':  'array'
    },
    'maxColors': { 'minimum': 1, 'type': 'number' },
    'metadata': {
      'additionalProperties': true,
      'type':                 'object'
    },
    'roles':      { 'type': 'object' },
    'runtime': {
      'additionalProperties': false,
      'properties': {
        'colorSpace': { 'enum': ['srgb', 'displayP3'], 'type': 'string' },
        'extra':      { 'additionalProperties': true, 'type': 'object' },
        'framing':    { 'enum': ['dark', 'light'], 'type': 'string' }
      },
      'type': 'object'
    }
  },
  'required':           ['colors'],
  'type':               'object'
} as const;
