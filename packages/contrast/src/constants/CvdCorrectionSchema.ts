export const CVD_CORRECTION_SCHEMA = Object.freeze({
  'additionalProperties': false,
  'properties': {
    'adjustedRoles': { 'items': { 'type': 'string' }, 'minItems': 1, 'type': 'array' },
    'background': { 'type': 'string' },
    'cvdTypesFixed': { 'items': { 'type': 'string' }, 'type': 'array' },
    'cvdTypesRemaining': { 'items': { 'type': 'string' }, 'type': 'array' },
    'disposition': { 'enum': ['not-needed', 'adjusted-foreground', 'adjusted-background', 'blocked-stated', 'unresolved'], 'type': 'string' },
    'foreground': { 'type': 'string' }
  },
  'required': ['adjustedRoles', 'background', 'cvdTypesFixed', 'cvdTypesRemaining', 'disposition', 'foreground'],
  'type': 'object'
} as const);
