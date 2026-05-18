export const InputSchema = {
  '$id':                'https://studnicky.dev/iridis/Input',
  'type':               'object',
  'required':           ['colors'],
  'additionalProperties': false,
  'properties': {
    'colors':     { 'type': 'array' },
    'roles':      { 'type': 'object' },
    'contrast': {
      'type': 'object',
      'additionalProperties': false,
      'properties': {
        'level':     { 'type': 'string' },
        'algorithm': { 'type': 'string', 'enum': ['wcag21', 'apca'] },
        'extra':     { 'type': 'array' },
      },
    },
    'maxColors': { 'type': 'number', 'minimum': 1 },
    'bypass':    { 'type': 'boolean' },
    'emit': {
      'type':  'array',
      'items': { 'type': 'string' },
    },
    'runtime': {
      'type': 'object',
      'additionalProperties': false,
      'properties': {
        'framing':    { 'type': 'string', 'enum': ['dark', 'light'] },
        'colorSpace': { 'type': 'string', 'enum': ['srgb', 'displayP3'] },
        'extra':      { 'type': 'object', 'additionalProperties': true },
      },
    },
    'metadata': {
      'type':                 'object',
      'additionalProperties': true,
    },
  },
} as const;
