import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { emitAndroidThemeXml }       from './tasks/EmitAndroidThemeXml.ts';
import { emitCapacitorSplashScreen } from './tasks/EmitCapacitorSplashScreen.ts';
import { emitCapacitorStatusBar }    from './tasks/EmitCapacitorStatusBar.ts';
import { emitCapacitorTheme }        from './tasks/EmitCapacitorTheme.ts';

const statusBarOutputSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'backgroundColor': { 'type': 'string' },
    'style':           { 'type': 'string', 'enum': ['DARK', 'LIGHT'] },
    'overlay':         { 'type': 'boolean' },
  },
  'required': ['backgroundColor', 'style', 'overlay'],
} as const;

const themeOutputSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'primary':        { 'type': 'string' },
    'primaryDark':    { 'type': 'string' },
    'primaryLight':   { 'type': 'string' },
    'accent':         { 'type': 'string' },
    'background':     { 'type': 'string' },
    'surface':        { 'type': 'string' },
    'error':          { 'type': 'string' },
    'warning':        { 'type': 'string' },
    'success':        { 'type': 'string' },
    'info':           { 'type': 'string' },
    'text':           { 'type': 'string' },
    'textOnPrimary':  { 'type': 'string' },
    'textOnAccent':   { 'type': 'string' },
  },
  'required': [
    'primary', 'primaryDark', 'primaryLight', 'accent',
    'background', 'surface', 'error', 'warning', 'success',
    'info', 'text', 'textOnPrimary', 'textOnAccent',
  ],
} as const;

const splashScreenOutputSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'backgroundColor':            { 'type': 'string' },
    'androidSplashResourceName':  { 'type': 'string' },
  },
  'required': ['backgroundColor'],
} as const;

const androidThemeXmlOutputSchema = {
  'type': 'string',
} as const;

export class CapacitorPlugin implements PluginInterface {
  readonly 'name'    = 'capacitor';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [
      emitCapacitorStatusBar,
      emitCapacitorTheme,
      emitCapacitorSplashScreen,
      emitAndroidThemeXml,
    ];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'outputs': {
        'capacitor:statusBar':       statusBarOutputSchema,
        'capacitor:theme':           themeOutputSchema,
        'capacitor:splashScreen':    splashScreenOutputSchema,
        'capacitor:androidThemeXml': androidThemeXmlOutputSchema,
      },
    };
  }
}

export const capacitorPlugin = new CapacitorPlugin();
