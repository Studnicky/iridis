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
  'description':          'Configure your palette, framing, contrast, and color space. Your settings drive every live demo on this site and persist across pages.',
  'additionalProperties': false,
  'required':             ['paletteColors', 'framing', 'contrastLevel', 'contrastAlgorithm', 'colorSpace', 'roleSchema'],
  'properties': {
    'paletteColors': {
      'type':        'array',
      'title':       'Palette colors',
      'description': 'The colors in your palette. Hex format. Variable count — every demo expands these into its target output.',
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
      'description': 'Number of roles the engine resolves the palette into. iridis-4 is the absolute minimum (background, text, brand, muted). Each tier is a superset — picking a smaller tier produces a sparser palette, demonstrating what that schema actually gives you.',
      'enum':        ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16'],
      'default':     'iridis-16',
    },
  },
} as const;

export type DocsConfigType = {
  'paletteColors':     string[];
  'framing':           'dark' | 'light';
  'contrastLevel':     'AA' | 'AAA';
  'contrastAlgorithm': 'wcag21' | 'apca';
  'colorSpace':        'srgb' | 'displayP3';
  'roleSchema':        'iridis-4' | 'iridis-8' | 'iridis-12' | 'iridis-16';
};

export const docsConfigDefaults: DocsConfigType = {
  'paletteColors':     ['#7c3aed', '#06b6d4', '#10b981', '#ec4899'],
  'framing':           'dark',
  'contrastLevel':     'AA',
  'contrastAlgorithm': 'wcag21',
  'colorSpace':        'srgb',
  'roleSchema':        'iridis-16',
};
