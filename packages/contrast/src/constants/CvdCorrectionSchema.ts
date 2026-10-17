export const CVD_CORRECTION_SCHEMA = Object.freeze({
  'additionalProperties': false,
  'properties': {
    'background': { 'type': 'string' },
    'cvdTypesFixed': { 'items': { 'type': 'string' }, 'type': 'array' },
    'cvdTypesRemaining': { 'items': { 'type': 'string' }, 'type': 'array' },
    'foreground': { 'type': 'string' }
  },
  'type': 'object'
} as const);
