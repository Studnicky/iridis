export const RoleSchemaSchema = {
  '$id':       'https://studnicky.dev/iridis/RoleSchema',
  'additionalProperties': false,
  'properties': {
    'contrastPairs': {
      'items': {
        'additionalProperties': false,
        'properties': {
          'algorithm':  { 'enum': ['wcag21', 'apca'], 'type': 'string' },
          'background': { 'type': 'string' },
          'foreground': { 'type': 'string' },
          'minRatio':   { 'maximum': 21, 'minimum': 1, 'type': 'number' }
        },
        'required': ['foreground', 'background', 'minRatio'],
        'type':     'object'
      },
      'type':  'array'
    },
    'description': { 'type': 'string' },
    'name':        { 'type': 'string' },
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
          'derivedFrom':    { 'description': 'Other role name; if present, expand:family seeds from it.', 'type': 'string' },
          'description': { 'type': 'string' },
          'hue':        { 'maximum': 360, 'minimum':    0, 'type': 'number' },
          'hueClamp':   { 'maximum': 180, 'minimum':    0, 'type': 'number' },
          'hueOffset':  { 'maximum': 360, 'minimum': -360, 'type': 'number' },
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
