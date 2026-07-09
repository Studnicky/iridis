import type { RoleSchemaInterfaceType } from '@studnicky/iridis';

/**
 * 16-role schema for VS Code theme generation.
 *
 * Lightness and chroma ranges are derived from the arcade-blaster dark-mode
 * DARK_CLAMPS table in paletteClamp.ts (reference only, not imported).
 * Ranges use OKLCh scale: lightness 0–1, chroma 0–0.4 (mapped from HSL 0–100).
 *
 * DEFAULT VARIANT: dark.
 * To use light: pass { roles: { ...vscodeRoleSchema16, name: 'vscode-16-light' } }
 * and swap the lightnessRange / chromaRange values from LIGHT_CLAMPS.
 *
 * The engine's expand:family task fills any role whose hex is absent in the
 * input by deriving it from the role listed in `derivedFrom`.
 */
export const vscodeRoleSchema16: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'foreground',  'minRatio': 7.0 },
    { 'algorithm': 'wcag21',    'background': 'background', 'foreground': 'comment',  'minRatio': 3.0 },
    { 'algorithm': 'wcag21',    'background': 'background', 'foreground': 'keyword',  'minRatio': 4.5 },
    { 'algorithm': 'wcag21',       'background': 'background', 'foreground': 'type',  'minRatio': 4.5 },
    { 'algorithm': 'wcag21',   'background': 'background', 'foreground': 'function',  'minRatio': 4.5 },
    { 'algorithm': 'wcag21',   'background': 'background', 'foreground': 'variable',  'minRatio': 4.5 },
    { 'algorithm': 'wcag21',     'background': 'background', 'foreground': 'string',  'minRatio': 4.5 },
    { 'algorithm': 'wcag21',     'background': 'background', 'foreground': 'number',  'minRatio': 4.5 },
    { 'algorithm': 'wcag21',   'background': 'background', 'foreground': 'constant',  'minRatio': 4.5 },
    { 'algorithm': 'wcag21',      'background': 'background', 'foreground': 'error',  'minRatio': 4.5 }
  ],
  'description': '16-role schema for VS Code dark-theme generation. Ranges sourced from arcade-blaster DARK_CLAMPS.',
  'name':        'vscode-16-dark',
  'roles': [
    {
      'chromaRange':    [0.00, 0.12],
      'description':    'Editor and chrome background',
      'intent':         'background',
      // DARK_CLAMPS.background: lMin 3, lMax 20 → OKLCh ≈ 0.03–0.20; sMin 0, sMax 30 → chroma ≈ 0–0.12
      'lightnessRange': [0.03, 0.20],
      'name':           'background',
      'required':       true
    },
    {
      'chromaRange':    [0.00, 0.08],
      'description':    'Primary text / editor foreground',
      'intent':         'text',
      // DARK_CLAMPS.foreground: lMin 85, lMax 98 → OKLCh ≈ 0.85–0.98; sMin 0, sMax 20 → chroma ≈ 0–0.08
      'lightnessRange': [0.85, 0.98],
      'name':           'foreground',
      'required':       true
    },
    {
      'chromaRange':    [0.00, 0.14],
      'derivedFrom':    'background',
      'description':    'Sidebar, panels, activity bar background',
      'intent':         'background',
      // DARK_CLAMPS.surface: lMin 5, lMax 22; sMin 0, sMax 35 → chroma ≈ 0–0.14
      'lightnessRange': [0.05, 0.22],
      'name':           'surface',
      'required':       true
    },
    {
      'chromaRange':    [0.00, 0.10],
      'derivedFrom':    'foreground',
      'description':    'Inactive/subdued text, gutters',
      'intent':         'muted',
      // DARK_CLAMPS.muted: lMin 35, lMax 60; sMin 0, sMax 25 → chroma ≈ 0–0.10
      'lightnessRange': [0.35, 0.60],
      'name':           'muted',
      'required':       true
    },
    {
      'chromaRange':    [0.16, 0.40],
      'description':    'Keywords, accent colour, primary interactive',
      'intent':         'accent',
      // DARK_CLAMPS.accent: lMin 50, lMax 85; sMin 40, sMax 100 → chroma ≈ 0.16–0.40
      'lightnessRange': [0.50, 0.85],
      'name':           'keyword',
      'required':       true
    },
    {
      'chromaRange':    [0.16, 0.40],
      'derivedFrom':    'keyword',
      'description':    'Types, classes, interfaces, structs',
      'hueOffset':      150,
      'intent':         'accent',
      // DARK_CLAMPS.semantic: lMin 55, lMax 85; sMin 40, sMax 100 → chroma ≈ 0.16–0.40
      'lightnessRange': [0.55, 0.85],
      'name':           'type',
      'required':       true
    },
    {
      'chromaRange':    [0.16, 0.40],
      'derivedFrom':    'keyword',
      'description':    'Functions, methods, decorators, events',
      'hueOffset':      45,
      'intent':         'accent',
      'lightnessRange': [0.55, 0.85],
      'name':           'function',
      'required':       true
    },
    {
      'chromaRange':    [0.16, 0.40],
      'derivedFrom':    'foreground',
      'description':    'Variables, parameters, properties',
      'intent':         'accent',
      'lightnessRange': [0.55, 0.85],
      'name':           'variable',
      'required':       true
    },
    {
      'chromaRange':    [0.16, 0.40],
      'derivedFrom':    'function',
      'description':    'String literals, regular expressions',
      'hueOffset':      70,
      'intent':         'accent',
      'lightnessRange': [0.55, 0.85],
      'name':           'string',
      'required':       true
    },
    {
      'chromaRange':    [0.16, 0.40],
      'derivedFrom':    'string',
      'description':    'Numeric literals',
      'hueOffset':      50,
      'intent':         'accent',
      'lightnessRange': [0.55, 0.85],
      'name':           'number',
      'required':       true
    },
    {
      'chromaRange':    [0.16, 0.40],
      'derivedFrom':    'number',
      'description':    'Constants, enum members',
      'hueOffset':      50,
      'intent':         'accent',
      'lightnessRange': [0.55, 0.85],
      'name':           'constant',
      'required':       true
    },
    {
      'chromaRange':    [0.03, 0.20],
      'derivedFrom':    'muted',
      'description':    'Comments, doc-comments',
      'intent':         'muted',
      // DARK_CLAMPS.comment: lMin 40, lMax 65; sMin 8, sMax 50 → chroma ≈ 0.03–0.20
      'lightnessRange': [0.40, 0.65],
      'name':           'comment',
      'required':       true
    },
    {
      'chromaRange':    [0.20, 0.40],
      'description':    'Error diagnostics',
      'intent':         'critical',
      // DARK_CLAMPS.diagnostics: lMin 55, lMax 80; sMin 50, sMax 100 → chroma ≈ 0.20–0.40
      'lightnessRange': [0.55, 0.80],
      'name':           'error',
      'required':       true
    },
    {
      'chromaRange':    [0.20, 0.40],
      'derivedFrom':    'error',
      'description':    'Warning diagnostics',
      'intent':         'muted',
      'lightnessRange': [0.55, 0.80],
      'name':           'warning',
      'required':       true
    },
    {
      'chromaRange':    [0.20, 0.40],
      'derivedFrom':    'error',
      'description':    'Info diagnostics, async hint colour',
      'intent':         'muted',
      'lightnessRange': [0.55, 0.80],
      'name':           'info',
      'required':       true
    },
    {
      'chromaRange':    [0.20, 0.40],
      'derivedFrom':    'error',
      'description':    'Success / positive diagnostics, git added',
      'intent':         'positive',
      'lightnessRange': [0.55, 0.80],
      'name':           'success',
      'required':       true
    }
  ]
};
