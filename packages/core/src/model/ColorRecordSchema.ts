export const ColorRecordSchema = {
  '$id':       'https://studnicky.dev/iridis/ColorRecord',
  'additionalProperties': false,
  'properties': {
    'alpha':        { 'maximum': 1, 'minimum': 0, 'type': 'number' },
    'displayP3': {
      'additionalProperties': false,
      'properties': {
        'b': { 'maximum': 1, 'minimum': 0, 'type': 'number' },
        'g': { 'maximum': 1, 'minimum': 0, 'type': 'number' },
        'r': { 'maximum': 1, 'minimum': 0, 'type': 'number' }
      },
      'required': ['r', 'g', 'b'],
      'type':     'object'
    },
    'hex':          { 'pattern': '^#[0-9a-fA-F]{6}$', 'type': 'string' },
    'hints': {
      'additionalProperties': false,
      'properties': {
        'intent': {
          'enum': ['text', 'background', 'accent', 'muted', 'critical', 'positive', 'link', 'button', 'onAccent', 'onButton'],
          'type': 'string'
        },
        'role':   { 'type': 'string' },
        'weight': { 'minimum': 0, 'type': 'number' }
      },
      'type':     'object'
    },
    'oklch': {
      'additionalProperties': false,
      'properties': {
        'c': { 'maximum': 0.5, 'minimum': 0, 'type': 'number' },
        'h': { 'maximum': 360, 'minimum': 0, 'type': 'number' },
        'l': { 'maximum': 1, 'minimum': 0, 'type': 'number' }
      },
      'required': ['l', 'c', 'h'],
      'type':     'object'
    },
    'rgb': {
      'additionalProperties': false,
      'properties': {
        'b': { 'maximum': 1, 'minimum': 0, 'type': 'number' },
        'g': { 'maximum': 1, 'minimum': 0, 'type': 'number' },
        'r': { 'maximum': 1, 'minimum': 0, 'type': 'number' }
      },
      'required': ['r', 'g', 'b'],
      'type':     'object'
    },
    'sourceFormat': {
      'enum': ['hex', 'rgb', 'hsl', 'oklch', 'lab', 'named', 'imagePixel', 'displayP3'],
      'type': 'string'
    }
  },
  'required':  ['oklch', 'rgb', 'hex', 'alpha', 'sourceFormat'],
  'type':      'object'
} as const;
