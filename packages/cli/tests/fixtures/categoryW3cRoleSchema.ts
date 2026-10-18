import { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';

export const categoryW3cRoleSchema = RoleSchemaInterfaceTypeEntity.create({
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'canvas', 'foreground': 'text', 'minimumContrastRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'surface', 'foreground': 'text', 'minimumContrastRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'accent', 'foreground': 'onAccent', 'minimumContrastRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'canvas', 'foreground': 'border', 'minimumContrastRatio': 3.0 }
  ],
  'description': 'WCAG 2.1 AA role schema for category colour palettes',
  'name': 'category-w3c',
  'roles': [
    {
      'description': 'Page / card background',
      'intent': 'background',
      'lightnessRange': [0.92, 1.0],
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
      'description': 'Primary interactive / brand colour',
      'intent': 'accent',
      'name': 'accent',
      'required': true
    },
    {
      'derivedFrom': 'accent',
      'description': 'Text / icons placed on accent',
      'intent': 'text',
      'lightnessRange': [0.98, 1.0],
      'name': 'onAccent',
      'required': true
    },
    {
      'description': 'Dividers and focus rings',
      'intent': 'muted',
      'lightnessRange': [0.60, 0.80],
      'name': 'border'
    },
    {
      'description': 'Secondary / de-emphasised text',
      'intent': 'muted',
      'lightnessRange': [0.45, 0.65],
      'name': 'muted'
    },
    {
      'description': 'Primary body text',
      'intent': 'text',
      'lightnessRange': [0.10, 0.25],
      'name': 'text',
      'required': true
    }
  ]
});
