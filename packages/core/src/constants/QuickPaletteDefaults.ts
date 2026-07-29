import type { RoleSchemaInterfaceType } from '../types/index.ts';

/** Four-role dark-framing schema used by {@link import('../QuickPalette.ts').QuickPalette}. */
const SCHEMA_DARK: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description':   undefined,
  'name':          'quick-dark',
  'roles': [
    { 'chromaRange': [0, 0.04],    'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.05, 0.12], 'name': 'background', 'required': true },
    { 'chromaRange': [0, 0.03],    'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text',       'lightnessRange': [0.94, 0.99], 'name': 'foreground', 'required': true },
    { 'chromaRange': [0.14, 0.28], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent',     'lightnessRange': [0.62, 0.78], 'name': 'accent',     'required': true },
    { 'chromaRange': [0, 0.05],    'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted',      'lightnessRange': [0.55, 0.70], 'name': 'muted',      'required': true }
  ]
};

/** Four-role light-framing schema used by {@link import('../QuickPalette.ts').QuickPalette}. */
const SCHEMA_LIGHT: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description':   undefined,
  'name':          'quick-light',
  'roles': [
    { 'chromaRange': [0, 0.02],    'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.96, 1.0],  'name': 'background', 'required': true },
    { 'chromaRange': [0, 0.03],    'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text',       'lightnessRange': [0.10, 0.20], 'name': 'foreground', 'required': true },
    { 'chromaRange': [0.12, 0.24], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent',     'lightnessRange': [0.42, 0.55], 'name': 'accent',     'required': true },
    { 'chromaRange': [0, 0.04],    'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted',      'lightnessRange': [0.40, 0.55], 'name': 'muted',      'required': true }
  ]
};

/** Task pipeline run by {@link import('../QuickPalette.ts').QuickPalette}. */
const PIPELINE: readonly string[] = ['intake:hex', 'resolve:roles'];

export const QUICK_PALETTE_DEFAULTS = {
  'PIPELINE':     PIPELINE,
  'SCHEMA_DARK':  SCHEMA_DARK,
  'SCHEMA_LIGHT': SCHEMA_LIGHT
} as const;
