export const APCA_PAIR_RESULT_SCHEMA = Object.freeze({
  'additionalProperties': false,
  'properties': {
    'afterLc': { 'type': 'number' },
    'algorithm': { 'enum': ['apca'], 'type': 'string' },
    'background': { 'type': 'string' },
    'beforeLc': { 'type': 'number' },
    'foreground': { 'type': 'string' },
    'pass': { 'type': 'boolean' },
    'requiredLc': { 'type': 'number' }
  },
  'type': 'object'
} as const);
