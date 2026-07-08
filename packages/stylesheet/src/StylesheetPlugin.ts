import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface
} from '@studnicky/iridis';

import { emitCssVars }       from './tasks/EmitCssVars.ts';
import { emitCssVarsScoped } from './tasks/EmitCssVarsScoped.ts';

const cssVarsOutputSchema = {
  'additionalProperties': false,
  'properties': {
    'darkScheme':   { 'type': 'string' },
    'forcedColors': { 'type': 'string' },
    'full':         { 'type': 'string' },
    'map':          { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
    'rootBlock':    { 'type': 'string' },
    'scopedBlock':  { 'type': 'string' },
    'wideGamut':    { 'type': 'string' }
  },
  'type': 'object'
} as const;

const cssVarsScopedOutputSchema = {
  'additionalProperties': false,
  'properties': {
    'blocks':    { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
    'full':      { 'type': 'string' },
    'wideGamut': { 'additionalProperties': { 'type': 'string' }, 'type': 'object' }
  },
  'type': 'object'
} as const;

class StylesheetPlugin implements PluginInterface {
  readonly 'name'    = 'stylesheet';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [emitCssVars, emitCssVarsScoped];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'outputs': {
        'stylesheet:cssVars':       cssVarsOutputSchema,
        'stylesheet:cssVarsScoped': cssVarsScopedOutputSchema
      }
    };
  }
}

export const stylesheetPlugin = new StylesheetPlugin();
