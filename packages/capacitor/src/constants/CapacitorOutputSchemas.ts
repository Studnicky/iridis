export const CAPACITOR_OUTPUT_SCHEMAS = Object.freeze({
  'androidThemeXml': { 'type': 'string' } as const,
  'splashScreen': {
    'additionalProperties': false,
    'properties': {
      'androidSplashResourceName': { 'type': 'string' },
      'backgroundColor':           { 'type': 'string' }
    },
    'required': ['backgroundColor'],
    'type': 'object'
  } as const,
  'statusBar': {
    'additionalProperties': false,
    'properties': {
      'backgroundColor': { 'type': 'string' },
      'overlay':         { 'type': 'boolean' },
      'style':           { 'enum': ['DARK', 'LIGHT'], 'type': 'string' }
    },
    'required': ['backgroundColor', 'style', 'overlay'],
    'type': 'object'
  } as const,
  'theme': {
    'additionalProperties': false,
    'properties': {
      'accent':        { 'type': 'string' },
      'background':    { 'type': 'string' },
      'error':         { 'type': 'string' },
      'info':          { 'type': 'string' },
      'primary':       { 'type': 'string' },
      'primaryDark':   { 'type': 'string' },
      'primaryLight':  { 'type': 'string' },
      'success':       { 'type': 'string' },
      'surface':       { 'type': 'string' },
      'text':          { 'type': 'string' },
      'textOnAccent':  { 'type': 'string' },
      'textOnPrimary': { 'type': 'string' },
      'warning':       { 'type': 'string' }
    },
    'required': [
      'primary', 'primaryDark', 'primaryLight', 'accent',
      'background', 'surface', 'error', 'warning', 'success',
      'info', 'text', 'textOnPrimary', 'textOnAccent'
    ],
    'type': 'object'
  } as const
});
