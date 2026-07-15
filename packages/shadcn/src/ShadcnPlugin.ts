import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface
} from '@studnicky/iridis';

import { EmitShadcnTheme } from './tasks/EmitShadcnTheme.ts';

const shadcnOutputSchema = {
  'additionalProperties': false,
  'properties': {
    'colors':  { 'additionalProperties': true, 'type': 'object' },
    'cssVars': { 'type': 'string' }
  },
  'type': 'object'
} as const;

export class ShadcnPlugin implements PluginInterface {
  readonly 'name'    = 'shadcn';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [new EmitShadcnTheme()];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'metadata': undefined,
      'outputs':  { 'shadcn:theme': shadcnOutputSchema }
    };
  }
}
