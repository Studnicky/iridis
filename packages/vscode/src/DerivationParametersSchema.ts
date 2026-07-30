export const DerivationParametersSchema = {
  '$id': 'https://studnicky.dev/iridis-vscode/DerivationParameters',
  'additionalProperties': false,
  'properties': {
    'hue':   { 'type': 'number' },
    'light': { 'type': 'number' },
    'sat':   { 'type': 'number' }
  },
  'type': 'object'
} as const;
