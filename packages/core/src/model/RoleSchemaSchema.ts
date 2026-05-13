export const RoleSchemaSchema = {
  '$id':       'https://studnicky.dev/iridis/RoleSchema',
  'type':      'object',
  'required':  ['name', 'roles'],
  'additionalProperties': false,
  'properties': {
    'name':        { 'type': 'string' },
    'description': { 'type': 'string' },
    'roles': {
      'type':     'array',
      'items': {
        'type':     'object',
        'required': ['name'],
        'additionalProperties': false,
        'properties': {
          'name':        { 'type': 'string' },
          'description': { 'type': 'string' },
          'intent': {
            'type': 'string',
            'enum': ['base', 'accent', 'muted', 'critical', 'positive', 'neutral', 'surface', 'text'],
          },
          'required':       { 'type': 'boolean' },
          'derivedFrom':    { 'type': 'string', 'description': 'Other role name; if present, expand:family seeds from it.' },
          'lightnessRange': {
            'type':     'array',
            'minItems': 2,
            'maxItems': 2,
            'items':    { 'type': 'number', 'minimum': 0, 'maximum': 1 },
          },
          'chromaRange': {
            'type':     'array',
            'minItems': 2,
            'maxItems': 2,
            'items':    { 'type': 'number', 'minimum': 0, 'maximum': 0.5 },
          },
          'hueOffset':  { 'type': 'number', 'minimum': -360, 'maximum': 360 },
        },
      },
    },
    'contrastPairs': {
      'type':  'array',
      'items': {
        'type':     'object',
        'required': ['foreground', 'background', 'minRatio'],
        'additionalProperties': false,
        'properties': {
          'foreground': { 'type': 'string' },
          'background': { 'type': 'string' },
          'minRatio':   { 'type': 'number', 'minimum': 1, 'maximum': 21 },
          'algorithm':  { 'type': 'string', 'enum': ['wcag21', 'apca'] },
        },
      },
    },
  },
} as const;
