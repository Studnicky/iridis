export const PluginSchema = {
  '$id':      'https://studnicky.dev/iridis/Plugin',
  'type':     'object',
  'required': ['name', 'version'],
  'properties': {
    'name':    { 'type': 'string', 'minLength': 1 },
    'version': { 'type': 'string', 'minLength': 1 },
    'tasks':   {},
    'schemas': {},
  },
} as const;
