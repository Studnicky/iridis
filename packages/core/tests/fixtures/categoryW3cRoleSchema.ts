import type { RoleSchemaInterfaceType } from '@studnicky/iridis/model';

export const categoryW3cRoleSchema: RoleSchemaInterfaceType = {
  'name':        'category-w3c',
  'description': 'WCAG 2.1 AA role schema for category colour palettes',
  'roles': [
    {
      'name':           'canvas',
      'description':    'Page / card background',
      'intent':         'background',
      'required':       true,
      'lightnessRange': [0.92, 1.0],
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined
    },
    {
      'name':           'surface',
      'description':    'Elevated surface (modal, sheet)',
      'intent':         'background',
      'required':       true,
      'lightnessRange': [0.86, 0.96],
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined
    },
    {
      'name':           'accent',
      'description':    'Primary interactive / brand colour',
      'intent':         'accent',
      'required':       true,
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'lightnessRange': undefined
    },
    {
      'name':           'onAccent',
      'description':    'Text / icons placed on accent',
      'intent':         'text',
      'required':       true,
      'derivedFrom':    'accent',
      'lightnessRange': [0.98, 1.0],
      'chromaRange': undefined,
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined
    },
    {
      'name':           'border',
      'description':    'Dividers and focus rings',
      'intent':         'muted',
      'lightnessRange': [0.60, 0.80],
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'required': undefined
    },
    {
      'name':           'muted',
      'description':    'Secondary / de-emphasised text',
      'intent':         'muted',
      'lightnessRange': [0.45, 0.65],
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'required': undefined
    },
    {
      'name':           'text',
      'description':    'Primary body text',
      'intent':         'text',
      'required':       true,
      'lightnessRange': [0.10, 0.25],
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined
    },
  ],
  'contrastPairs': [
    { 'foreground': 'text',     'background': 'canvas',  'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'text',     'background': 'surface', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'onAccent', 'background': 'accent',  'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'border',   'background': 'canvas',  'minRatio': 3.0, 'algorithm': 'wcag21' },
  ],
};
