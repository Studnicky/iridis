import { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';

/** W3C-conformant role schema for per-category palettes. */
export const categoryW3cRoleSchema = RoleSchemaInterfaceTypeEntity.create({
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'canvas', 'foreground': 'text', 'minimumContrastRatio': 7 },
    { 'algorithm': 'wcag21', 'background': 'surface', 'foreground': 'text', 'minimumContrastRatio': 7 },
    { 'algorithm': 'wcag21', 'background': 'accent', 'foreground': 'onAccent', 'minimumContrastRatio': 7 },
    { 'algorithm': 'wcag21', 'background': 'canvas', 'foreground': 'border', 'minimumContrastRatio': 3 }
  ],
  'description': 'WCAG 2.1 AAA-strength role schema for category colour palettes',
  'name': 'category-w3c',
  'roles': [
    {
      'description': 'Page / card background',
      'intent': 'background',
      'lightnessRange': [0.92, 1],
      'name': 'canvas',
      'required': true
    },
    {
      'description': 'Elevated surface (modal, sheet)',
      'intent': 'background',
      'lightnessRange': [0.86, 0.96],
      'name': 'surface',
      'required': true
    },
    {
      'chromaRange': [0.1, 0.12],
      'description': 'Primary interactive / brand colour',
      'intent': 'accent',
      'lightnessRange': [0.35, 0.46],
      'name': 'accent',
      'required': true
    },
    {
      'derivedFrom': 'accent',
      'description': 'Text / icons placed on accent',
      'intent': 'onAccent',
      'lightnessRange': [0.98, 1],
      'name': 'onAccent',
      'required': true
    },
    {
      'description': 'Dividers and focus rings',
      'lightnessRange': [0.6, 0.8],
      'name': 'border'
    },
    {
      'description': 'Secondary / de-emphasised text',
      'intent': 'muted',
      'lightnessRange': [0.45, 0.65],
      'name': 'muted'
    },
    {
      'chromaRange': [0.08, 0.09],
      'description': 'Primary body text',
      'intent': 'text',
      'lightnessRange': [0.1, 0.23],
      'name': 'text',
      'required': true
    }
  ]
});
