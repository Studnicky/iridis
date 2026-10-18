import type {
  PluginInterface,
  PluginSchemaContributionInterfaceEntity,
  TaskInterface
} from '@studnicky/iridis';

import { emitTailwindTheme } from './tasks/singleton/EmitTailwindTheme.ts';

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
    return [emitTailwindTheme];
  }

  schemas(): PluginSchemaContributionInterfaceEntity.Type {
    return {
      'outputs':  { 'tailwind:theme': tailwindOutputSchema }
    };
  }
}
