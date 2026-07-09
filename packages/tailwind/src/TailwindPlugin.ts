import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface
} from '@studnicky/iridis';

import { EmitTailwindTheme } from './tasks/EmitTailwindTheme.ts';

const tailwindOutputSchema = {
  'additionalProperties': false,
  'properties': {
    'colors':  { 'additionalProperties': true, 'type': 'object' },
    'config':  { 'type': 'string' },
    'cssVars': { 'type': 'string' }
  },
  'type': 'object'
} as const;

export class TailwindPlugin implements PluginInterface {
  readonly 'name'    = 'tailwind';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [new EmitTailwindTheme()];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'outputs': { 'tailwind:theme': tailwindOutputSchema }
    };
  }
}
