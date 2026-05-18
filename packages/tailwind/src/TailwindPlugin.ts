import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { emitTailwindTheme } from './tasks/EmitTailwindTheme.ts';

const tailwindOutputSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'colors':  { 'type': 'object', 'additionalProperties': true },
    'cssVars': { 'type': 'string' },
    'config':  { 'type': 'string' },
  },
} as const;

export class TailwindPlugin implements PluginInterface {
  readonly 'name'    = 'tailwind';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [emitTailwindTheme];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'outputs': { 'tailwind:theme': tailwindOutputSchema },
    };
  }
}

export const tailwindPlugin = new TailwindPlugin();
