export const CVD_BLOCKED_PAIR_SCHEMA = Object.freeze({
  'additionalProperties': false,
  'properties': {
    'background': { 'type': 'string' },
    'cvdTypes': { 'items': { 'type': 'string' }, 'type': 'array' },
    'foreground': { 'type': 'string' },
    'reason': { 'enum': ['stated-both', 'solver-exhausted'], 'type': 'string' }
  },
  'required': ['background', 'cvdTypes', 'foreground', 'reason'],
  'type': 'object'
} as const);
