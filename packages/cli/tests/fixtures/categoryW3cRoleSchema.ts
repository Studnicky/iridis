import type { RoleSchemaInterfaceType } from '@studnicky/iridis/model';

export const categoryW3cRoleSchema: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21',     'background': 'canvas',  'foreground': 'text', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',     'background': 'surface', 'foreground': 'text', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'accent',  'foreground': 'onAccent', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',   'background': 'canvas',  'foreground': 'border', 'minRatio': 3.0 }
  ],
  'description': 'WCAG 2.1 AA role schema for category colour palettes',
  'name':        'category-w3c',
  'roles': [
    {
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'description':    'Page / card background',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent':         'background',
      'lightnessRange': [0.92, 1.0],
      'name':           'canvas',
      'required':       true
    },
    {
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'description':    'Elevated surface (modal, sheet)',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent':         'background',
      'lightnessRange': [0.86, 0.96],
      'name':           'surface',
      'required':       true
    },
    {
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'description':    'Primary interactive / brand colour',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent':         'accent',
      'lightnessRange': undefined,
      'name':           'accent',
      'required':       true
    },
    {
      'chromaRange': undefined,
      'derivedFrom':    'accent',
      'description':    'Text / icons placed on accent',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent':         'text',
      'lightnessRange': [0.98, 1.0],
      'name':           'onAccent',
      'required':       true
    },
    {
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'description':    'Dividers and focus rings',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent':         'muted',
      'lightnessRange': [0.60, 0.80],
      'name':           'border',
      'required': undefined
    },
    {
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'description':    'Secondary / de-emphasised text',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent':         'muted',
      'lightnessRange': [0.45, 0.65],
      'name':           'muted',
      'required': undefined
    },
    {
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'description':    'Primary body text',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent':         'text',
      'lightnessRange': [0.10, 0.25],
      'name':           'text',
      'required':       true
    }
  ]
};
