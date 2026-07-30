const CSS_VARS_SCHEMA = {
  'additionalProperties': false,
  'properties': {
    'darkScheme':   { 'type': 'string' },
    'forcedColors': { 'type': 'string' },
    'full':         { 'type': 'string' },
    'map':          { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
    'rootBlock':    { 'type': 'string' },
    'scopedBlock':  { 'type': 'string' },
    'wideGamut':    { 'type': 'string' }
  },
  'type': 'object'
} as const;

const CSS_VARS_SCOPED_SCHEMA = {
  'additionalProperties': false,
  'properties': {
    'blocks':    { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
    'full':      { 'type': 'string' },
    'wideGamut': { 'additionalProperties': { 'type': 'string' }, 'type': 'object' }
  },
  'type': 'object'
} as const;

export const CSS_VARS_OUTPUT_SCHEMAS = {
  'CSS_VARS':        CSS_VARS_SCHEMA,
  'CSS_VARS_SCOPED': CSS_VARS_SCOPED_SCHEMA
} as const;
