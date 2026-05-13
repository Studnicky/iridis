export const PluginSchema = {
  '$id':      'https://studnicky.dev/iridis/Plugin',
  'type':     'object',
  'required': ['name', 'version'],
  'properties': {
    'name':    { 'type': 'string' },
    'version': { 'type': 'string' },
    'tasks': {},
  },
} as const;
