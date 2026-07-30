import type { RoleSchemaInterfaceType } from '@studnicky/iridis/types';

/** W3C-conformant role schema for per-category palettes. */
export const categoryW3cRoleSchema: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'canvas', 'foreground': 'text', 'minRatio': 7 },
    { 'algorithm': 'wcag21', 'background': 'surface', 'foreground': 'text', 'minRatio': 7 },
    { 'algorithm': 'wcag21', 'background': 'accent', 'foreground': 'onAccent', 'minRatio': 7 },
    { 'algorithm': 'wcag21', 'background': 'canvas', 'foreground': 'border', 'minRatio': 3 }
  ],
  'description': 'WCAG 2.1 AAA-strength role schema for category colour palettes',
  'name': 'category-w3c',
  'roles': [
    {
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'description': 'Page / card background',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent': 'background',
      'lightnessRange': [0.92, 1],
      'name': 'canvas',
      'required': true
    },
    {
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'description': 'Elevated surface (modal, sheet)',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent': 'background',
      'lightnessRange': [0.86, 0.96],
      'name': 'surface',
      'required': true
    },
    {
      'chromaRange': [0.1, 0.12],
      'derivedFrom': undefined,
      'description': 'Primary interactive / brand colour',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent': 'accent',
      'lightnessRange': [0.35, 0.46],
      'name': 'accent',
      'required': true
    },
    {
      'chromaRange': undefined,
      'derivedFrom': 'accent',
      'description': 'Text / icons placed on accent',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent': 'onAccent',
      'lightnessRange': [0.98, 1],
      'name': 'onAccent',
      'required': true
    },
    {
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'description': 'Dividers and focus rings',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent': undefined,
      'lightnessRange': [0.6, 0.8],
      'name': 'border',
      'required': undefined
    },
    {
      'chromaRange': undefined,
      'derivedFrom': undefined,
      'description': 'Secondary / de-emphasised text',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent': 'muted',
      'lightnessRange': [0.45, 0.65],
      'name': 'muted',
      'required': undefined
    },
    {
      'chromaRange': [0.08, 0.09],
      'derivedFrom': undefined,
      'description': 'Primary body text',
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': undefined,
      'intent': 'text',
      'lightnessRange': [0.1, 0.23],
      'name': 'text',
      'required': true
    }
  ]
};
