import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface
} from '@studnicky/iridis';

import { EmitMuiTheme } from './tasks/EmitMuiTheme.ts';

const muiOutputSchema = {
  'additionalProperties': false,
  'properties': {
    'config':  { 'type': 'string' },
    'palette': { 'additionalProperties': true, 'type': 'object' }
  },
  'type': 'object'
} as const;

export class MuiPlugin implements PluginInterface {
  readonly 'name'    = 'mui';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [new EmitMuiTheme()];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'outputs': { 'mui:theme': muiOutputSchema }
    };
  }
}
