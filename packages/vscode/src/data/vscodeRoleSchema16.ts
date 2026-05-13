import type { RoleSchemaInterface } from '@studnicky/iridis';

/**
 * 16-role schema for VS Code theme generation.
 *
 * Lightness and chroma ranges are derived from the arcade-blaster dark-mode
 * DARK_CLAMPS table in paletteClamp.ts (reference only — not imported).
 * Ranges use OKLCh scale: lightness 0–1, chroma 0–0.4 (mapped from HSL 0–100).
 *
 * DEFAULT VARIANT: dark.
 * To use light: pass { roles: { ...vscodeRoleSchema16, name: 'vscode-16-light' } }
 * and swap the lightnessRange / chromaRange values from LIGHT_CLAMPS.
 *
 * The engine's expand:family task fills any role whose hex is absent in the
 * input by deriving it from the role listed in `derivedFrom`.
 */
export const vscodeRoleSchema16: RoleSchemaInterface = {
  'name':        'vscode-16-dark',
  'description': '16-role schema for VS Code dark-theme generation. Ranges sourced from arcade-blaster DARK_CLAMPS.',
  'roles': [
    {
      'name':           'background',
      'description':    'Editor and chrome background',
      'intent':         'background',
      'required':       true,
      // DARK_CLAMPS.background: lMin 3, lMax 20 → OKLCh ≈ 0.03–0.20; sMin 0, sMax 30 → chroma ≈ 0–0.12
      'lightnessRange': [0.03, 0.20],
      'chromaRange':    [0.00, 0.12],
    },
    {
      'name':           'foreground',
      'description':    'Primary text / editor foreground',
      'intent':         'text',
      'required':       true,
      // DARK_CLAMPS.foreground: lMin 85, lMax 98 → OKLCh ≈ 0.85–0.98; sMin 0, sMax 20 → chroma ≈ 0–0.08
      'lightnessRange': [0.85, 0.98],
      'chromaRange':    [0.00, 0.08],
    },
    {
      'name':           'surface',
      'description':    'Sidebar, panels, activity bar background',
      'intent':         'background',
      'required':       true,
      'derivedFrom':    'background',
      // DARK_CLAMPS.surface: lMin 5, lMax 22; sMin 0, sMax 35 → chroma ≈ 0–0.14
      'lightnessRange': [0.05, 0.22],
      'chromaRange':    [0.00, 0.14],
    },
    {
      'name':           'muted',
      'description':    'Inactive/subdued text, gutters',
      'intent':         'muted',
      'required':       true,
      'derivedFrom':    'foreground',
      // DARK_CLAMPS.muted: lMin 35, lMax 60; sMin 0, sMax 25 → chroma ≈ 0–0.10
      'lightnessRange': [0.35, 0.60],
      'chromaRange':    [0.00, 0.10],
    },
    {
      'name':           'keyword',
      'description':    'Keywords, accent colour, primary interactive',
      'intent':         'accent',
      'required':       true,
      // DARK_CLAMPS.accent: lMin 50, lMax 85; sMin 40, sMax 100 → chroma ≈ 0.16–0.40
      'lightnessRange': [0.50, 0.85],
      'chromaRange':    [0.16, 0.40],
    },
    {
      'name':           'type',
      'description':    'Types, classes, interfaces, structs',
      'intent':         'accent',
      'required':       true,
      'derivedFrom':    'keyword',
      // DARK_CLAMPS.semantic: lMin 55, lMax 85; sMin 40, sMax 100 → chroma ≈ 0.16–0.40
      'lightnessRange': [0.55, 0.85],
      'chromaRange':    [0.16, 0.40],
    },
    {
      'name':           'function',
      'description':    'Functions, methods, decorators, events',
      'intent':         'accent',
      'required':       true,
      'derivedFrom':    'keyword',
      'lightnessRange': [0.55, 0.85],
      'chromaRange':    [0.16, 0.40],
    },
    {
      'name':           'variable',
      'description':    'Variables, parameters, properties',
      'intent':         'accent',
      'required':       true,
      'derivedFrom':    'foreground',
      'lightnessRange': [0.55, 0.85],
      'chromaRange':    [0.16, 0.40],
    },
    {
      'name':           'string',
      'description':    'String literals, regular expressions',
      'intent':         'accent',
      'required':       true,
      'derivedFrom':    'function',
      'lightnessRange': [0.55, 0.85],
      'chromaRange':    [0.16, 0.40],
    },
    {
      'name':           'number',
      'description':    'Numeric literals',
      'intent':         'accent',
      'required':       true,
      'derivedFrom':    'string',
      'lightnessRange': [0.55, 0.85],
      'chromaRange':    [0.16, 0.40],
    },
    {
      'name':           'constant',
      'description':    'Constants, enum members',
      'intent':         'accent',
      'required':       true,
      'derivedFrom':    'number',
      'lightnessRange': [0.55, 0.85],
      'chromaRange':    [0.16, 0.40],
    },
    {
      'name':           'comment',
      'description':    'Comments, doc-comments',
      'intent':         'muted',
      'required':       true,
      'derivedFrom':    'muted',
      // DARK_CLAMPS.comment: lMin 40, lMax 65; sMin 8, sMax 50 → chroma ≈ 0.03–0.20
      'lightnessRange': [0.40, 0.65],
      'chromaRange':    [0.03, 0.20],
    },
    {
      'name':           'error',
      'description':    'Error diagnostics',
      'intent':         'critical',
      'required':       true,
      // DARK_CLAMPS.diagnostics: lMin 55, lMax 80; sMin 50, sMax 100 → chroma ≈ 0.20–0.40
      'lightnessRange': [0.55, 0.80],
      'chromaRange':    [0.20, 0.40],
    },
    {
      'name':           'warning',
      'description':    'Warning diagnostics',
      'intent':         'muted',
      'required':       true,
      'derivedFrom':    'error',
      'lightnessRange': [0.55, 0.80],
      'chromaRange':    [0.20, 0.40],
    },
    {
      'name':           'info',
      'description':    'Info diagnostics, async hint colour',
      'intent':         'muted',
      'required':       true,
      'derivedFrom':    'error',
      'lightnessRange': [0.55, 0.80],
      'chromaRange':    [0.20, 0.40],
    },
    {
      'name':           'success',
      'description':    'Success / positive diagnostics, git added',
      'intent':         'positive',
      'required':       true,
      'derivedFrom':    'error',
      'lightnessRange': [0.55, 0.80],
      'chromaRange':    [0.20, 0.40],
    },
  ],
  'contrastPairs': [
    { 'foreground': 'foreground', 'background': 'background', 'minRatio': 7.0,  'algorithm': 'wcag21' },
    { 'foreground': 'comment',    'background': 'background', 'minRatio': 3.0,  'algorithm': 'wcag21' },
    { 'foreground': 'keyword',    'background': 'background', 'minRatio': 4.5,  'algorithm': 'wcag21' },
    { 'foreground': 'type',       'background': 'background', 'minRatio': 4.5,  'algorithm': 'wcag21' },
    { 'foreground': 'function',   'background': 'background', 'minRatio': 4.5,  'algorithm': 'wcag21' },
    { 'foreground': 'variable',   'background': 'background', 'minRatio': 4.5,  'algorithm': 'wcag21' },
    { 'foreground': 'string',     'background': 'background', 'minRatio': 4.5,  'algorithm': 'wcag21' },
    { 'foreground': 'number',     'background': 'background', 'minRatio': 4.5,  'algorithm': 'wcag21' },
    { 'foreground': 'constant',   'background': 'background', 'minRatio': 4.5,  'algorithm': 'wcag21' },
    { 'foreground': 'error',      'background': 'background', 'minRatio': 4.5,  'algorithm': 'wcag21' },
  ],
};
