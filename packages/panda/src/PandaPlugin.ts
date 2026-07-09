import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface
} from '@studnicky/iridis';

import { EmitPandaTheme } from './tasks/EmitPandaTheme.ts';

const pandaOutputSchema = {
  'additionalProperties': false,
  'properties': {
    'colors':      { 'additionalProperties': true, 'type': 'object' },
    'pandaConfig': { 'type': 'string' },
    'unoConfig':   { 'type': 'string' }
  },
  'type': 'object'
} as const;

export class PandaPlugin implements PluginInterface {
  readonly 'name'    = 'panda';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [new EmitPandaTheme()];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'outputs': { 'panda:theme': pandaOutputSchema }
    };
  }
}
