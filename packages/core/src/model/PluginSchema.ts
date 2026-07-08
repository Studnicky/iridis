export const PluginSchema = {
  '$id':      'https://studnicky.dev/iridis/Plugin',
  'properties': {
    'name':    { 'minLength': 1, 'type': 'string' },
    'schemas': {},
    'tasks':   {},
    'version': { 'minLength': 1, 'type': 'string' }
  },
  'required': ['name', 'version'],
  'type':     'object'
} as const;
