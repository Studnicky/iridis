import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface
} from '@studnicky/iridis';

import { emitAndroidThemeXml }       from './tasks/EmitAndroidThemeXml.ts';
import { emitCapacitorSplashScreen } from './tasks/EmitCapacitorSplashScreen.ts';
import { emitCapacitorStatusBar }    from './tasks/EmitCapacitorStatusBar.ts';
import { emitCapacitorTheme }        from './tasks/EmitCapacitorTheme.ts';

const statusBarOutputSchema = {
  'additionalProperties': false,
  'properties': {
    'backgroundColor': { 'type': 'string' },
    'overlay':         { 'type': 'boolean' },
    'style':           { 'enum': ['DARK', 'LIGHT'], 'type': 'string' }
  },
  'required': ['backgroundColor', 'style', 'overlay'],
  'type': 'object'
} as const;

const themeOutputSchema = {
  'additionalProperties': false,
  'properties': {
    'accent':         { 'type': 'string' },
    'background':     { 'type': 'string' },
    'error':          { 'type': 'string' },
    'info':           { 'type': 'string' },
    'primary':        { 'type': 'string' },
    'primaryDark':    { 'type': 'string' },
    'primaryLight':   { 'type': 'string' },
    'success':        { 'type': 'string' },
    'surface':        { 'type': 'string' },
    'text':           { 'type': 'string' },
    'textOnAccent':   { 'type': 'string' },
    'textOnPrimary':  { 'type': 'string' },
    'warning':        { 'type': 'string' }
  },
  'required': [
    'primary', 'primaryDark', 'primaryLight', 'accent',
    'background', 'surface', 'error', 'warning', 'success',
    'info', 'text', 'textOnPrimary', 'textOnAccent'
  ],
  'type': 'object'
} as const;

const splashScreenOutputSchema = {
  'additionalProperties': false,
  'properties': {
    'androidSplashResourceName':  { 'type': 'string' },
    'backgroundColor':            { 'type': 'string' }
  },
  'required': ['backgroundColor'],
  'type': 'object'
} as const;

const androidThemeXmlOutputSchema = {
  'type': 'string'
} as const;

export class CapacitorPlugin implements PluginInterface {
  readonly 'name'    = 'capacitor';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [
      emitCapacitorStatusBar,
      emitCapacitorTheme,
      emitCapacitorSplashScreen,
      emitAndroidThemeXml
    ];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'outputs': {
        'capacitor:androidThemeXml': androidThemeXmlOutputSchema,
        'capacitor:splashScreen':    splashScreenOutputSchema,
        'capacitor:statusBar':       statusBarOutputSchema,
        'capacitor:theme':           themeOutputSchema
      }
    };
  }
}
