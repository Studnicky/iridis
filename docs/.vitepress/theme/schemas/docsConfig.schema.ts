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
      'description': 'WCAG threshold the enforce:contrast task lifts pairs to. Defaults to AAA — the strictest level — so derived palettes pass the most rigorous accessibility audit out of the box.',
      'enum':        ['AA', 'AAA'],
      'default':     'AAA',
    },
    'contrastAlgorithm': {
      'type':        'string',
      'title':       'Contrast algorithm',
      'description': 'WCAG 2.1 luminance ratio or APCA Lc perceptual model. Defaults to APCA — the modern perceptual algorithm WCAG 3 is built on — which generally enforces stricter targets for body text.',
      'enum':        ['wcag21', 'apca'],
      'default':     'apca',
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
      'description': 'Name of the active role schema. Built-in tiers are `iridis-4`, `iridis-8`, `iridis-12`, `iridis-16`, `iridis-32`. The RoleSchemaEditor publishes user-edited variants under `custom-<timestamp>` names; the field is intentionally a free-form string so dispatched edits can register their own schema.',
      'default':     'iridis-32',
    },
    'lockedRoles': {
      'type':        'object',
      'title':       'Locked roles',
      'description': 'User-pinned per-role hex overrides. The projector overwrites the engine-resolved hex with the locked value for any role whose name appears in this map. Used by the lock toggle on each resolved-role card.',
      'default':     {},
    },
    'looseEnvelope': {
      'type':        'boolean',
      'title':       'Loose envelope',
      'description': 'When true, the resolved-roles surface flags every role whose seed sat outside the declared lightness/chroma envelope. Visualisation only — the engine still clamps; the warning makes the engine\'s hand visible.',
      'default':     false,
    },
  },
} as const;

export type DocsConfigType = {
  'paletteColors':     string[];
  'framing':           'dark' | 'light';
  'contrastLevel':     'AA' | 'AAA';
  'contrastAlgorithm': 'wcag21' | 'apca';
  'colorSpace':        'srgb' | 'displayP3';
  /** Free-form string. Built-in tiers (`iridis-{4,8,12,16,32}`) and dispatcher-published `custom-<timestamp>` schemas both live under the same key. */
  'roleSchema':        string;
  /** role name → user-pinned hex. Overrides the engine-resolved hex on every projection. */
  'lockedRoles':       Record<string, string>;
  /** When true, the resolved-roles surface flags roles whose seed sat outside the schema envelope. */
  'looseEnvelope':     boolean;
};

/* Strict-by-default. The first-visit user gets the most rigorous
   accessibility audit the engine can run: AAA WCAG threshold (7:1
   normal text), APCA Lc targets (the perceptual model WCAG 3 is built
   on), strict envelope clamping. The schema spec above and this
   runtime object MUST stay in sync — both are read by different
   consumers (SchemaForm uses the JSON Schema spec; the dispatcher's
   reducer uses this object). */
export const docsConfigDefaults: DocsConfigType = {
  'paletteColors':     ['#7c3aed', '#06b6d4', '#10b981', '#ec4899'],
  'framing':           'dark',
  'contrastLevel':     'AAA',
  'contrastAlgorithm': 'apca',
  'colorSpace':        'srgb',
  'roleSchema':        'iridis-32',
  'lockedRoles':       {},
  'looseEnvelope':     false,
};
