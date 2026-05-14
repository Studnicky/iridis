export const ColorRecordSchema = {
  '$id':       'https://studnicky.dev/iridis/ColorRecord',
  'type':      'object',
  'required':  ['oklch', 'rgb', 'hex', 'alpha', 'sourceFormat'],
  'additionalProperties': false,
  'properties': {
    'oklch': {
      'type':     'object',
      'required': ['l', 'c', 'h'],
      'additionalProperties': false,
      'properties': {
        'l': { 'type': 'number', 'minimum': 0, 'maximum': 1 },
        'c': { 'type': 'number', 'minimum': 0, 'maximum': 0.5 },
        'h': { 'type': 'number', 'minimum': 0, 'maximum': 360 },
      },
    },
    'rgb': {
      'type':     'object',
      'required': ['r', 'g', 'b'],
      'additionalProperties': false,
      'properties': {
        'r': { 'type': 'number', 'minimum': 0, 'maximum': 1 },
        'g': { 'type': 'number', 'minimum': 0, 'maximum': 1 },
        'b': { 'type': 'number', 'minimum': 0, 'maximum': 1 },
      },
    },
    'hex':          { 'type': 'string', 'pattern': '^#[0-9a-fA-F]{6}$' },
    'alpha':        { 'type': 'number', 'minimum': 0, 'maximum': 1 },
    'sourceFormat': {
      'type': 'string',
      'enum': ['hex', 'rgb', 'hsl', 'oklch', 'lab', 'named', 'imagePixel', 'displayP3'],
    },
    'displayP3': {
      'type':     'object',
      'required': ['r', 'g', 'b'],
      'additionalProperties': false,
      'properties': {
        'r': { 'type': 'number', 'minimum': 0, 'maximum': 1 },
        'g': { 'type': 'number', 'minimum': 0, 'maximum': 1 },
        'b': { 'type': 'number', 'minimum': 0, 'maximum': 1 },
      },
    },
    'hints': {
      'type':     'object',
      'additionalProperties': false,
      'properties': {
        'role':   { 'type': 'string' },
        'intent': {
          'type': 'string',
          'enum': ['text', 'background', 'accent', 'muted', 'critical', 'positive', 'link', 'button', 'onAccent', 'onButton'],
        },
        'weight': { 'type': 'number', 'minimum': 0 },
      },
    },
  },
} as const;
