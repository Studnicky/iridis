/**
 * docsConfig.schema.ts
 *
 * Single source of truth for what the user can configure on the docs site.
 * Drives both:
 *   1. The sidebar config form (via SchemaForm.vue walking this schema).
 *   2. The runtime input passed into engine.run(input) by every IridisDemo.
 *
 * Authored as a JSON Schema literal with `as const` so the type is inferred
 * from the schema, not duplicated. Matches iridis's no-Zod / no-Ajv stance.
 */

export const docsConfigSchema = {
  '$id':                  'https://studnicky.dev/iridis/docs-config',
  'type':                 'object',
  'title':                'Docs configuration',
  'description':          'Configure seed colors, framing, contrast, and color space. Your settings drive every live demo on this site and persist across pages.',
  'additionalProperties': false,
  'required':             ['seedColors', 'framing', 'contrastLevel', 'contrastAlgorithm', 'colorSpace', 'roleSchema'],
  'properties': {
    'seedColors': {
      'type':        'array',
      'title':       'Seed colors',
      'description': 'One or more starting colors. Hex format. Variable count — every demo expands these into its target output.',
      'minItems':    1,
      'maxItems':    8,
      'items':       { 'type': 'string', 'format': 'color', 'pattern': '^#[0-9a-fA-F]{6}$' },
      'default':     ['#7c3aed', '#06b6d4', '#10b981', '#ec4899'],
    },
    'framing': {
      'type':        'string',
      'title':       'Framing',
      'description': 'Dark frame (museum) or light room. Read by every emitter to flip surface colors.',
      'enum':        ['dark', 'light'],
      'default':     'dark',
    },
    'contrastLevel': {
      'type':        'string',
      'title':       'Contrast level',
      'description': 'WCAG threshold the enforce:contrast task lifts pairs to.',
      'enum':        ['AA', 'AAA'],
      'default':     'AA',
    },
    'contrastAlgorithm': {
      'type':        'string',
      'title':       'Contrast algorithm',
      'description': 'WCAG 2.1 ratio or APCA Lc.',
      'enum':        ['wcag21', 'apca'],
      'default':     'wcag21',
    },
    'colorSpace': {
      'type':        'string',
      'title':       'Color space',
      'description': 'sRGB (universal) or Display P3 (wide-gamut). Read by emitters that support both.',
      'enum':        ['srgb', 'displayP3'],
      'default':     'srgb',
    },
    'roleSchema': {
      'type':        'string',
      'title':       'Role schema',
      'description': 'Which role definition the engine resolves seeds into.',
      'enum':        ['minimal', 'w3c', 'material'],
      'default':     'minimal',
    },
  },
} as const;

export type DocsConfigType = {
  'seedColors':        string[];
  'framing':           'dark' | 'light';
  'contrastLevel':     'AA' | 'AAA';
  'contrastAlgorithm': 'wcag21' | 'apca';
  'colorSpace':        'srgb' | 'displayP3';
  'roleSchema':        'minimal' | 'w3c' | 'material';
};

export const docsConfigDefaults: DocsConfigType = {
  'seedColors':        ['#7c3aed', '#06b6d4', '#10b981', '#ec4899'],
  'framing':           'dark',
  'contrastLevel':     'AA',
  'contrastAlgorithm': 'wcag21',
  'colorSpace':        'srgb',
  'roleSchema':        'minimal',
};
