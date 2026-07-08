export const TaskManifestSchema = {
  '$id':                'https://studnicky.dev/iridis/TaskManifest',
  'additionalProperties': false,
  'properties': {
    'description': { 'type': 'string' },
    'name':        { 'minLength': 1, 'type': 'string' },
    'phase':       { 'enum': ['onRunStart', 'onRunEnd'], 'type': 'string' },
    'reads':       { 'items': { 'type': 'string' }, 'type': 'array' },
    'requires':    { 'items': { 'type': 'string' }, 'type': 'array' },
    'writes':      { 'items': { 'type': 'string' }, 'type': 'array' }
  },
  'required':           ['name'],
  'type':               'object'
} as const;
