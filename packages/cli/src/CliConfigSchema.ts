import { InputInterfaceTypeEntity } from '@studnicky/iridis';

export const CliConfigSchema = {
  '$id': 'https://studnicky.dev/iridis-cli/CliConfig',
  'additionalProperties': false,
  'properties': {
    'enableCapacitor':  { 'type': 'boolean' },
    'enableContrast':   { 'type': 'boolean' },
    'enableImage':      { 'type': 'boolean' },
    'enableRdf':        { 'type': 'boolean' },
    'enableStylesheet': { 'type': 'boolean' },
    'enableTailwind':   { 'type': 'boolean' },
    'enableVscode':     { 'type': 'boolean' },
    'input': InputInterfaceTypeEntity.Schema,
    'output': {
      'additionalProperties': false,
      'properties': {
        'directory': { 'type': 'string' },
        'files': {
          'additionalProperties': { 'type': 'string' },
          'type': 'object'
        }
      },
      'required': ['directory', 'files'],
      'type': 'object'
    },
    'pipeline': {
      'items': { 'type': 'string' },
      'minItems': 1,
      'type': 'array'
    }
  },
  'required': ['input', 'pipeline', 'output'],
  'type': 'object'
} as const;
