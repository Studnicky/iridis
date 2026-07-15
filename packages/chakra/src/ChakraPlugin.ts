import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface
} from '@studnicky/iridis';

import { EmitChakraTheme } from './tasks/EmitChakraTheme.ts';

const chakraOutputSchema = {
  'additionalProperties': false,
  'properties': {
    'colors': { 'additionalProperties': true, 'type': 'object' },
    'config': { 'type': 'string' }
  },
  'type': 'object'
} as const;

export class ChakraPlugin implements PluginInterface {
  readonly 'name'    = 'chakra';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [new EmitChakraTheme()];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'metadata': undefined,
      'outputs':  { 'chakra:theme': chakraOutputSchema }
    };
  }
}
