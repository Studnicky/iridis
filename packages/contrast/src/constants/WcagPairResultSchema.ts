export const WCAG_PAIR_RESULT_SCHEMA = Object.freeze({
  'additionalProperties': false,
  'properties': {
    'after': { 'type': 'number' },
    'algorithm': { 'enum': ['wcag21', 'apca'], 'type': 'string' },
    'background': { 'type': 'string' },
    'before': { 'type': 'number' },
    'foreground': { 'type': 'string' },
    'pass': { 'type': 'boolean' },
    'required': { 'type': 'number' }
  },
  'type': 'object'
} as const);
