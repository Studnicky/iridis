export const CVD_WARNING_SCHEMA = Object.freeze({
  'additionalProperties': false,
  'properties': {
    'background': { 'type': 'string' },
    'cvdType': { 'type': 'string' },
    'drop': { 'type': 'number' },
    'dropThreshold': { 'type': 'number' },
    'foreground': { 'type': 'string' },
    'minimumSimulatedContrast': { 'type': 'number' },
    'originalLuminanceContrast': { 'type': 'number' },
    'simulatedContrastDropRatio': { 'type': 'number' },
    'simulatedContrastRatio': { 'type': 'number' },
    'simulatedLuminanceContrast': { 'type': 'number' }
  },
  'type': 'object'
} as const);
