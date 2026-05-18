import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { emitCssVars }       from './tasks/EmitCssVars.ts';
import { emitCssVarsScoped } from './tasks/EmitCssVarsScoped.ts';

const cssVarsOutputSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'rootBlock':    { 'type': 'string' },
    'scopedBlock':  { 'type': 'string' },
    'darkScheme':   { 'type': 'string' },
    'forcedColors': { 'type': 'string' },
    'wideGamut':    { 'type': 'string' },
    'full':         { 'type': 'string' },
    'map':          { 'type': 'object', 'additionalProperties': { 'type': 'string' } },
  },
} as const;

const cssVarsScopedOutputSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'blocks':    { 'type': 'object', 'additionalProperties': { 'type': 'string' } },
    'wideGamut': { 'type': 'object', 'additionalProperties': { 'type': 'string' } },
    'full':      { 'type': 'string' },
  },
} as const;

export class StylesheetPlugin implements PluginInterface {
  readonly 'name'    = 'stylesheet';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [emitCssVars, emitCssVarsScoped];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'outputs': {
        'stylesheet:cssVars':       cssVarsOutputSchema,
        'stylesheet:cssVarsScoped': cssVarsScopedOutputSchema,
      },
    };
  }
}

export const stylesheetPlugin = new StylesheetPlugin();
