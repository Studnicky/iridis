const wcagPairResultSchema = {
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
} as const;

const apcaPairResultSchema = {
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
} as const;

const cvdWarningSchema = {
  'additionalProperties': false,
  'properties': {
    'background': { 'type': 'string' },
    'cvdType': { 'type': 'string' },
    'drop': { 'type': 'number' },
    'dropThreshold': { 'type': 'number' },
    'foreground': { 'type': 'string' },
    'minSimulatedContrast': { 'type': 'number' },
    'originalLuminanceContrast': { 'type': 'number' },
    'simulatedContrastDropRatio': { 'type': 'number' },
    'simulatedContrastRatio': { 'type': 'number' },
    'simulatedLuminanceContrast': { 'type': 'number' }
  },
  'type': 'object'
} as const;

const cvdCorrectionSchema = {
  'additionalProperties': false,
  'properties': {
    'background': { 'type': 'string' },
    'cvdTypesFixed': { 'items': { 'type': 'string' }, 'type': 'array' },
    'cvdTypesRemaining': { 'items': { 'type': 'string' }, 'type': 'array' },
    'foreground': { 'type': 'string' }
  },
  'type': 'object'
} as const;

export const CONTRAST_PLUGIN_SCHEMAS = Object.freeze({
  'aa': {
    'additionalProperties': false,
    'properties': { 'pairs': { 'items': wcagPairResultSchema, 'type': 'array' } },
    'type': 'object'
  },
  'aaa': {
    'additionalProperties': false,
    'properties': { 'pairs': { 'items': wcagPairResultSchema, 'type': 'array' } },
    'type': 'object'
  },
  'apca': {
    'additionalProperties': false,
    'properties': { 'pairs': { 'items': apcaPairResultSchema, 'type': 'array' } },
    'type': 'object'
  },
  'cvd': {
    'additionalProperties': false,
    'properties': {
      'corrections': { 'items': cvdCorrectionSchema, 'type': 'array' },
      'warnings': { 'items': cvdWarningSchema, 'type': 'array' }
    },
    'type': 'object'
  }
} as const);
