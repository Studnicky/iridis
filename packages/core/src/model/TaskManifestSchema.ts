export const TaskManifestSchema = {
  '$id':                'https://studnicky.dev/iridis/TaskManifest',
  'type':               'object',
  'required':           ['name'],
  'additionalProperties': false,
  'properties': {
    'name':        { 'type': 'string', 'minLength': 1 },
    'phase':       { 'type': 'string', 'enum': ['onRunStart', 'onRunEnd'] },
    'reads':       { 'type': 'array', 'items': { 'type': 'string' } },
    'writes':      { 'type': 'array', 'items': { 'type': 'string' } },
    'requires':    { 'type': 'array', 'items': { 'type': 'string' } },
    'description': { 'type': 'string' },
  },
} as const;
