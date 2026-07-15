/**
 * RoleSchemaByName.ts
 *
 * Built-in iridis role schemas for the docs site. Each tier is a superset
 * of the previous (4 ⊂ 8 ⊂ 12 ⊂ 16 ⊂ 32), so picking a smaller tier
 * produces a sparser palette and the docs page paints with fewer tokens
 * (that sparseness IS the demonstration of what each schema gives you).
 *
 * Each tier ships as a { dark, light } pair. Same role names, same contrast
 * pairs, only lightness ranges differ. The framing toggle in the navbar
 * swaps which variant feeds the engine; the engine produces both modes
 * idiomatically without renderer-side inversion.
 *
 *   iridis-4  : background, text, brand, muted
 *   iridis-8  : + surface, bgSoft, divider, onBrand
 *   iridis-12 : + success, warning, error, syntaxKeyword
 *   iridis-16 : + syntaxString, syntaxNumber, syntaxFunction, syntaxType
 *
 * Derivations use derivedFrom + hueOffset so a single brand seed produces
 * the full syntax family in iridis-16. The engine's expand:family task
 * synthesizes derived roles; resolve:roles nudges seeds into their
 * lightness/chroma envelopes; enforce:contrast lifts pairs to threshold.
 */

import type { RoleSchemaInterfaceType } from '@studnicky/iridis/model';

import type { SchemaPairType } from '../composables/types/index.ts';

/* ─── iridis-4 ─────────────────────────────────────────────────────── */

const iridis4Dark: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21',  'background': 'background', 'foreground': 'text', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'brand', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'muted', 'minRatio': 4.5 }
  ],
  'description': 'Minimal four-role schema (dark framing). Background, text, brand, muted.',
  'name':        'iridis-4-dark',
  'roles': [
    { 'chromaRange': [0.00, 0.04], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.04, 0.14], 'name': 'background', 'required': true },
    { 'chromaRange': [0.00, 0.04],       'derivedFrom': undefined,       'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text', 'lightnessRange': [0.85, 0.96], 'name': 'text', 'required': true },
    { 'chromaRange': [0.12, 0.30],      'derivedFrom': undefined,     'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': [0.55, 0.78], 'name': 'brand', 'required': true },
    { 'chromaRange': [0.00, 0.06],      'derivedFrom': undefined,                        'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.50, 0.68], 'name': 'muted', 'required': undefined }
  ]
};

const iridis4Light: RoleSchemaInterfaceType = {
  'contrastPairs': [
    { 'algorithm': 'wcag21',  'background': 'background', 'foreground': 'text', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'brand', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'muted', 'minRatio': 4.5 }
  ],
  'description': 'Minimal four-role schema (light framing). Background, text, brand, muted.',
  'name':        'iridis-4-light',
  'roles': [
    { 'chromaRange': [0.00, 0.03], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.94, 0.99], 'name': 'background', 'required': true },
    { 'chromaRange': [0.00, 0.04],       'derivedFrom': undefined,       'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text', 'lightnessRange': [0.10, 0.22], 'name': 'text', 'required': true },
    { 'chromaRange': [0.14, 0.32],      'derivedFrom': undefined,     'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': [0.40, 0.58], 'name': 'brand', 'required': true },
    { 'chromaRange': [0.00, 0.06],      'derivedFrom': undefined,                        'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.40, 0.55], 'name': 'muted', 'required': undefined }
  ]
};

/* ─── iridis-8 ─────────────────────────────────────────────────────── */

const iridis8Dark: RoleSchemaInterfaceType = {
  'contrastPairs': [
    ...(iridis4Dark.contrastPairs ?? []),
    { 'algorithm': 'wcag21',     'background': 'surface',    'foreground': 'text', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',     'background': 'bg-soft',    'foreground': 'text', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'brand',      'foreground': 'on-brand', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',  'background': 'background', 'foreground': 'divider', 'minRatio': 3.0 }
  ],
  'description': 'Eight-role schema (dark framing). Adds surface, bgSoft, divider, onBrand.',
  'name':        'iridis-8-dark',
  'roles': [
    ...iridis4Dark.roles,
    { 'chromaRange': [0.00, 0.06],  'derivedFrom': 'background', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.08, 0.18], 'name': 'surface', 'required': true },
    { 'chromaRange': [0.00, 0.08],  'derivedFrom': 'background', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.10, 0.22], 'name': 'bg-soft', 'required': undefined },
    { 'chromaRange': [0.00, 0.06],  'derivedFrom': 'background',      'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.18, 0.32], 'name': 'divider', 'required': undefined },
    { 'chromaRange': [0.00, 0.02], 'derivedFrom': 'brand',       'description': undefined, 'hue': undefined,      'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text', 'lightnessRange': [0.04, 0.14], 'name': 'on-brand', 'required': true }
  ]
};

const iridis8Light: RoleSchemaInterfaceType = {
  'contrastPairs': [
    ...(iridis4Light.contrastPairs ?? []),
    { 'algorithm': 'wcag21',     'background': 'surface',    'foreground': 'text', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',     'background': 'bg-soft',    'foreground': 'text', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'brand',      'foreground': 'on-brand', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',  'background': 'background', 'foreground': 'divider', 'minRatio': 3.0 }
  ],
  'description': 'Eight-role schema (light framing). Adds surface, bg-soft, divider, on-brand.',
  'name':        'iridis-8-light',
  'roles': [
    ...iridis4Light.roles,
    { 'chromaRange': [0.00, 0.04],  'derivedFrom': 'background', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.88, 0.96], 'name': 'surface', 'required': true },
    { 'chromaRange': [0.00, 0.04],  'derivedFrom': 'background', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.90, 0.98], 'name': 'bg-soft', 'required': undefined },
    { 'chromaRange': [0.00, 0.04],  'derivedFrom': 'background',      'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.72, 0.86], 'name': 'divider', 'required': undefined },
    { 'chromaRange': [0.00, 0.02], 'derivedFrom': 'brand',       'description': undefined, 'hue': undefined,      'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text', 'lightnessRange': [0.97, 1.00], 'name': 'on-brand', 'required': true }
  ]
};

/* ─── iridis-12 ────────────────────────────────────────────────────── */

const iridis12Dark: RoleSchemaInterfaceType = {
  'contrastPairs': [
    ...(iridis8Dark.contrastPairs ?? []),
    { 'algorithm': 'wcag21',       'background': 'background', 'foreground': 'success', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',       'background': 'background', 'foreground': 'warning', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',         'background': 'background', 'foreground': 'error', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'bg-soft',     'foreground': 'syntax-keyword', 'minRatio': 4.5 }
  ],
  'description': 'Twelve-role schema (dark framing). Adds success, warning, error, syntaxKeyword.',
  'name':        'iridis-12-dark',
  'roles': [
    ...iridis8Dark.roles,
    { 'chromaRange': [0.14, 0.28],       'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 120, 'intent': 'positive', 'lightnessRange': [0.65, 0.78], 'name': 'success', 'required': undefined },
    { 'chromaRange': [0.16, 0.28],       'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset':  85, 'intent': 'positive', 'lightnessRange': [0.70, 0.82], 'name': 'warning', 'required': undefined },
    { 'chromaRange': [0.18, 0.30],         'derivedFrom': undefined,                          'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'critical', 'lightnessRange': [0.62, 0.76], 'name': 'error', 'required': undefined },
    { 'chromaRange': [0.14, 0.28], 'derivedFrom': 'brand',   'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': [0.68, 0.82], 'name': 'syntax-keyword', 'required': undefined }
  ]
};

const iridis12Light: RoleSchemaInterfaceType = {
  'contrastPairs': [
    ...(iridis8Light.contrastPairs ?? []),
    { 'algorithm': 'wcag21',       'background': 'background', 'foreground': 'success', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',       'background': 'background', 'foreground': 'warning', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',         'background': 'background', 'foreground': 'error', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'bg-soft',     'foreground': 'syntax-keyword', 'minRatio': 4.5 }
  ],
  'description': 'Twelve-role schema (light framing). Adds success, warning, error, syntaxKeyword.',
  'name':        'iridis-12-light',
  'roles': [
    ...iridis8Light.roles,
    { 'chromaRange': [0.16, 0.30],       'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 120, 'intent': 'positive', 'lightnessRange': [0.40, 0.52], 'name': 'success', 'required': undefined },
    { 'chromaRange': [0.18, 0.30],       'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset':  85, 'intent': 'positive', 'lightnessRange': [0.50, 0.62], 'name': 'warning', 'required': undefined },
    { 'chromaRange': [0.20, 0.32],         'derivedFrom': undefined,                          'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'critical', 'lightnessRange': [0.40, 0.55], 'name': 'error', 'required': undefined },
    { 'chromaRange': [0.16, 0.30], 'derivedFrom': 'brand',   'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': [0.42, 0.56], 'name': 'syntax-keyword', 'required': undefined }
  ]
};

/* ─── iridis-16 ────────────────────────────────────────────────────── */

const iridis16Dark: RoleSchemaInterfaceType = {
  'contrastPairs': [
    ...(iridis12Dark.contrastPairs ?? []),
    { 'algorithm': 'wcag21',   'background': 'bg-soft', 'foreground': 'syntax-string', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',   'background': 'bg-soft', 'foreground': 'syntax-number', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'bg-soft', 'foreground': 'syntax-function', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',     'background': 'bg-soft', 'foreground': 'syntax-type', 'minRatio': 4.5 }
  ],
  'description': 'Full sixteen-role schema (dark framing). Complete chrome + status + syntax theme.',
  'name':        'iridis-16-dark',
  'roles': [
    ...iridis12Dark.roles,
    { 'chromaRange': [0.14, 0.26],   'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 120, 'intent': 'accent', 'lightnessRange': [0.70, 0.85], 'name': 'syntax-string', 'required': undefined },
    { 'chromaRange': [0.14, 0.28],   'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset':  60, 'intent': 'accent', 'lightnessRange': [0.70, 0.85], 'name': 'syntax-number', 'required': undefined },
    { 'chromaRange': [0.12, 0.24], 'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 180, 'intent': 'accent', 'lightnessRange': [0.68, 0.82], 'name': 'syntax-function', 'required': undefined },
    { 'chromaRange': [0.10, 0.22],     'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 210, 'intent': 'accent', 'lightnessRange': [0.70, 0.84], 'name': 'syntax-type', 'required': undefined }
  ]
};

const iridis16Light: RoleSchemaInterfaceType = {
  'contrastPairs': [
    ...(iridis12Light.contrastPairs ?? []),
    { 'algorithm': 'wcag21',   'background': 'bg-soft', 'foreground': 'syntax-string', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',   'background': 'bg-soft', 'foreground': 'syntax-number', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'bg-soft', 'foreground': 'syntax-function', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',     'background': 'bg-soft', 'foreground': 'syntax-type', 'minRatio': 4.5 }
  ],
  'description': 'Full sixteen-role schema (light framing). Complete chrome + status + syntax theme.',
  'name':        'iridis-16-light',
  'roles': [
    ...iridis12Light.roles,
    { 'chromaRange': [0.14, 0.26],   'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 120, 'intent': 'accent', 'lightnessRange': [0.40, 0.52], 'name': 'syntax-string', 'required': undefined },
    { 'chromaRange': [0.16, 0.28],   'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset':  60, 'intent': 'accent', 'lightnessRange': [0.45, 0.58], 'name': 'syntax-number', 'required': undefined },
    { 'chromaRange': [0.14, 0.26], 'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 180, 'intent': 'accent', 'lightnessRange': [0.40, 0.52], 'name': 'syntax-function', 'required': undefined },
    { 'chromaRange': [0.12, 0.22],     'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 210, 'intent': 'accent', 'lightnessRange': [0.40, 0.52], 'name': 'syntax-type', 'required': undefined }
  ]
};

/* ─── iridis-32 ────────────────────────────────────────────────────── */

/* Sixteen-role tier extended with emphasis tiers, interaction colors,
   chrome variants, and the full editor-style syntax family. Mirrors
   the conceptual surface that large-scale design systems (vscode,
   ide themes, full chrome+code+status surfaces) consume. */

const iridis32Dark: RoleSchemaInterfaceType = {
  'contrastPairs': [
    ...(iridis16Dark.contrastPairs ?? []),
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text-strong', 'minRatio': 7.0 },
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text-subtle', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',        'background': 'background', 'foreground': 'link', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',  'background': 'background', 'foreground': 'link-hover', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',        'background': 'background', 'foreground': 'info', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',  'background': 'background', 'foreground': 'accent-alt', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',         'background': 'code-bg', 'foreground': 'syntax-tag', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',   'background': 'code-bg', 'foreground': 'syntax-attribute', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',    'background': 'code-bg', 'foreground': 'syntax-operator', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',       'background': 'code-bg', 'foreground': 'syntax-class', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',     'background': 'code-bg', 'foreground': 'syntax-comment', 'minRatio': 3.0 },
    { 'algorithm': 'wcag21', 'background': 'code-bg', 'foreground': 'syntax-punctuation', 'minRatio': 3.0 }
  ],
  'description': 'Thirty-two-role schema (dark framing). Adds emphasis tiers, interaction colors, chrome variants, and extended syntax tokens.',
  'name':        'iridis-32-dark',
  'roles': [
    ...iridis16Dark.roles,
    /* Emphasis tiers: text-strong reads as primary headings, text-subtle as captions / metadata. */
    { 'chromaRange': [0.00, 0.03],  'derivedFrom': 'text', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text', 'lightnessRange': [0.92, 0.99], 'name': 'text-strong', 'required': undefined },
    { 'chromaRange': [0.00, 0.04],  'derivedFrom': 'text', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.62, 0.74], 'name': 'text-subtle', 'required': undefined },
    /* Interaction family: link/link-hover for anchors, focus-ring for a11y outlines. */
    { 'chromaRange': [0.14, 0.28],         'derivedFrom': 'brand',   'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': -15, 'intent': 'link', 'lightnessRange': [0.62, 0.78], 'name': 'link', 'required': undefined },
    { 'chromaRange': [0.16, 0.30],   'derivedFrom': 'brand',   'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': -15, 'intent': 'link', 'lightnessRange': [0.72, 0.86], 'name': 'link-hover', 'required': undefined },
    { 'chromaRange': [0.20, 0.34],   'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': [0.60, 0.75], 'name': 'focus-ring', 'required': undefined },
    /* Chrome variants: overlays, alternate borders, code surfaces. */
    { 'chromaRange': [0.00, 0.04],      'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.02, 0.10], 'name': 'overlay', 'required': undefined },
    { 'chromaRange': [0.00, 0.06],       'derivedFrom': 'divider',      'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.22, 0.34], 'name': 'border', 'required': undefined },
    { 'chromaRange': [0.00, 0.08],'derivedFrom': 'divider',      'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.32, 0.46], 'name': 'border-strong', 'required': undefined },
    { 'chromaRange': [0.00, 0.04],      'derivedFrom': 'bg-soft', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.08, 0.16], 'name': 'code-bg', 'required': undefined },
    /* Status family: info completes the warning/error/success quadrant. */
    { 'chromaRange': [0.16, 0.28],         'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': -60, 'intent': 'accent', 'lightnessRange': [0.55, 0.72], 'name': 'info', 'required': undefined },
    /* Secondary accent: pairs with brand for two-color emphasis. */
    { 'chromaRange': [0.14, 0.26],   'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 150, 'intent': 'accent', 'lightnessRange': [0.58, 0.74], 'name': 'accent-alt', 'required': undefined },
    /* Extended syntax: comment / tag / attribute / operator / class / punctuation. */
    { 'chromaRange': [0.00, 0.06],     'derivedFrom': 'muted',  'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.48, 0.60], 'name': 'syntax-comment', 'required': undefined },
    { 'chromaRange': [0.14, 0.26],         'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 240, 'intent': 'accent', 'lightnessRange': [0.68, 0.82], 'name': 'syntax-tag', 'required': undefined },
    { 'chromaRange': [0.12, 0.24],   'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 270, 'intent': 'accent', 'lightnessRange': [0.68, 0.82], 'name': 'syntax-attribute', 'required': undefined },
    { 'chromaRange': [0.10, 0.22],    'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 300, 'intent': 'accent', 'lightnessRange': [0.70, 0.84], 'name': 'syntax-operator', 'required': undefined },
    { 'chromaRange': [0.14, 0.26],       'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset':  30, 'intent': 'accent', 'lightnessRange': [0.70, 0.84], 'name': 'syntax-class', 'required': undefined },
    { 'chromaRange': [0.00, 0.08], 'derivedFrom': 'muted',  'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.58, 0.72], 'name': 'syntax-punctuation', 'required': undefined }
  ]
};

const iridis32Light: RoleSchemaInterfaceType = {
  'contrastPairs': [
    ...(iridis16Light.contrastPairs ?? []),
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text-strong', 'minRatio': 7.0 },
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text-subtle', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',        'background': 'background', 'foreground': 'link', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',  'background': 'background', 'foreground': 'link-hover', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',        'background': 'background', 'foreground': 'info', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',  'background': 'background', 'foreground': 'accent-alt', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',         'background': 'code-bg', 'foreground': 'syntax-tag', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',   'background': 'code-bg', 'foreground': 'syntax-attribute', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',    'background': 'code-bg', 'foreground': 'syntax-operator', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',       'background': 'code-bg', 'foreground': 'syntax-class', 'minRatio': 4.5 },
    { 'algorithm': 'wcag21',     'background': 'code-bg', 'foreground': 'syntax-comment', 'minRatio': 3.0 },
    { 'algorithm': 'wcag21', 'background': 'code-bg', 'foreground': 'syntax-punctuation', 'minRatio': 3.0 }
  ],
  'description': 'Thirty-two-role schema (light framing). Adds emphasis tiers, interaction colors, chrome variants, and extended syntax tokens.',
  'name':        'iridis-32-light',
  'roles': [
    ...iridis16Light.roles,
    { 'chromaRange': [0.00, 0.04],  'derivedFrom': 'text', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text', 'lightnessRange': [0.04, 0.12], 'name': 'text-strong', 'required': undefined },
    { 'chromaRange': [0.00, 0.05],  'derivedFrom': 'text', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.32, 0.46], 'name': 'text-subtle', 'required': undefined },
    { 'chromaRange': [0.14, 0.28],         'derivedFrom': 'brand',   'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': -15, 'intent': 'link', 'lightnessRange': [0.36, 0.50], 'name': 'link', 'required': undefined },
    { 'chromaRange': [0.16, 0.30],   'derivedFrom': 'brand',   'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': -15, 'intent': 'link', 'lightnessRange': [0.28, 0.42], 'name': 'link-hover', 'required': undefined },
    { 'chromaRange': [0.20, 0.34],   'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': [0.40, 0.58], 'name': 'focus-ring', 'required': undefined },
    { 'chromaRange': [0.00, 0.03],      'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.85, 0.94], 'name': 'overlay', 'required': undefined },
    { 'chromaRange': [0.00, 0.05],       'derivedFrom': 'divider',      'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.72, 0.84], 'name': 'border', 'required': undefined },
    { 'chromaRange': [0.00, 0.06],'derivedFrom': 'divider',      'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.60, 0.72], 'name': 'border-strong', 'required': undefined },
    { 'chromaRange': [0.00, 0.03],      'derivedFrom': 'bg-soft', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.92, 0.97], 'name': 'code-bg', 'required': undefined },
    { 'chromaRange': [0.16, 0.28],         'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': -60, 'intent': 'accent', 'lightnessRange': [0.36, 0.50], 'name': 'info', 'required': undefined },
    { 'chromaRange': [0.14, 0.26],   'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 150, 'intent': 'accent', 'lightnessRange': [0.36, 0.50], 'name': 'accent-alt', 'required': undefined },
    { 'chromaRange': [0.00, 0.06],     'derivedFrom': 'muted',  'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.45, 0.58], 'name': 'syntax-comment', 'required': undefined },
    { 'chromaRange': [0.14, 0.26],         'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 240, 'intent': 'accent', 'lightnessRange': [0.38, 0.52], 'name': 'syntax-tag', 'required': undefined },
    { 'chromaRange': [0.12, 0.24],   'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 270, 'intent': 'accent', 'lightnessRange': [0.38, 0.52], 'name': 'syntax-attribute', 'required': undefined },
    { 'chromaRange': [0.10, 0.22],    'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': 300, 'intent': 'accent', 'lightnessRange': [0.40, 0.52], 'name': 'syntax-operator', 'required': undefined },
    { 'chromaRange': [0.14, 0.26],       'derivedFrom': 'brand', 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset':  30, 'intent': 'accent', 'lightnessRange': [0.38, 0.52], 'name': 'syntax-class', 'required': undefined },
    { 'chromaRange': [0.00, 0.08], 'derivedFrom': 'muted',  'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'muted', 'lightnessRange': [0.40, 0.55], 'name': 'syntax-punctuation', 'required': undefined }
  ]
};

/* ─── Public registry ─────────────────────────────────────────────── */

export const roleSchemaByName: Record<string, SchemaPairType> = {
  'iridis-12': { 'dark': iridis12Dark, 'light': iridis12Light },
  'iridis-16': { 'dark': iridis16Dark, 'light': iridis16Light },
  'iridis-32': { 'dark': iridis32Dark, 'light': iridis32Light },
  'iridis-4':  { 'dark': iridis4Dark,  'light': iridis4Light  },
  'iridis-8':  { 'dark': iridis8Dark,  'light': iridis8Light  }
};
