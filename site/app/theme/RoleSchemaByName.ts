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
    { 'chromaRange': [0.00, 0.04], 'intent': 'background', 'lightnessRange': [0.04, 0.14], 'name': 'background', 'required': true },
    { 'chromaRange': [0.00, 0.04],       'intent': 'text',       'lightnessRange': [0.85, 0.96], 'name': 'text', 'required': true },
    { 'chromaRange': [0.12, 0.30],      'intent': 'accent',     'lightnessRange': [0.55, 0.78], 'name': 'brand', 'required': true },
    { 'chromaRange': [0.00, 0.06],      'intent': 'muted',                        'lightnessRange': [0.50, 0.68], 'name': 'muted' }
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
    { 'chromaRange': [0.00, 0.03], 'intent': 'background', 'lightnessRange': [0.94, 0.99], 'name': 'background', 'required': true },
    { 'chromaRange': [0.00, 0.04],       'intent': 'text',       'lightnessRange': [0.10, 0.22], 'name': 'text', 'required': true },
    { 'chromaRange': [0.14, 0.32],      'intent': 'accent',     'lightnessRange': [0.40, 0.58], 'name': 'brand', 'required': true },
    { 'chromaRange': [0.00, 0.06],      'intent': 'muted',                        'lightnessRange': [0.40, 0.55], 'name': 'muted' }
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
    { 'chromaRange': [0.00, 0.06],  'derivedFrom': 'background', 'intent': 'background', 'lightnessRange': [0.08, 0.18], 'name': 'surface', 'required': true },
    { 'chromaRange': [0.00, 0.08],  'derivedFrom': 'background', 'intent': 'background', 'lightnessRange': [0.10, 0.22], 'name': 'bg-soft' },
    { 'chromaRange': [0.00, 0.06],  'derivedFrom': 'background',      'intent': 'muted', 'lightnessRange': [0.18, 0.32], 'name': 'divider' },
    { 'chromaRange': [0.00, 0.02], 'derivedFrom': 'brand',       'intent': 'text', 'lightnessRange': [0.04, 0.14],      'name': 'on-brand', 'required': true }
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
    { 'chromaRange': [0.00, 0.04],  'derivedFrom': 'background', 'intent': 'background', 'lightnessRange': [0.88, 0.96], 'name': 'surface', 'required': true },
    { 'chromaRange': [0.00, 0.04],  'derivedFrom': 'background', 'intent': 'background', 'lightnessRange': [0.90, 0.98], 'name': 'bg-soft' },
    { 'chromaRange': [0.00, 0.04],  'derivedFrom': 'background',      'intent': 'muted', 'lightnessRange': [0.72, 0.86], 'name': 'divider' },
    { 'chromaRange': [0.00, 0.02], 'derivedFrom': 'brand',       'intent': 'text', 'lightnessRange': [0.97, 1.00],      'name': 'on-brand', 'required': true }
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
    { 'chromaRange': [0.14, 0.28],       'derivedFrom': 'brand', 'hueOffset': 120, 'intent': 'positive', 'lightnessRange': [0.65, 0.78], 'name': 'success' },
    { 'chromaRange': [0.16, 0.28],       'derivedFrom': 'brand', 'hueOffset':  85, 'intent': 'positive', 'lightnessRange': [0.70, 0.82], 'name': 'warning' },
    { 'chromaRange': [0.18, 0.30],         'intent': 'critical',                          'lightnessRange': [0.62, 0.76], 'name': 'error' },
    { 'chromaRange': [0.14, 0.28], 'derivedFrom': 'brand',   'intent': 'accent', 'lightnessRange': [0.68, 0.82], 'name': 'syntax-keyword' }
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
    { 'chromaRange': [0.16, 0.30],       'derivedFrom': 'brand', 'hueOffset': 120, 'intent': 'positive', 'lightnessRange': [0.40, 0.52], 'name': 'success' },
    { 'chromaRange': [0.18, 0.30],       'derivedFrom': 'brand', 'hueOffset':  85, 'intent': 'positive', 'lightnessRange': [0.50, 0.62], 'name': 'warning' },
    { 'chromaRange': [0.20, 0.32],         'intent': 'critical',                          'lightnessRange': [0.40, 0.55], 'name': 'error' },
    { 'chromaRange': [0.16, 0.30], 'derivedFrom': 'brand',   'intent': 'accent', 'lightnessRange': [0.42, 0.56], 'name': 'syntax-keyword' }
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
    { 'chromaRange': [0.14, 0.26],   'derivedFrom': 'brand', 'hueOffset': 120, 'intent': 'accent', 'lightnessRange': [0.70, 0.85], 'name': 'syntax-string' },
    { 'chromaRange': [0.14, 0.28],   'derivedFrom': 'brand', 'hueOffset':  60, 'intent': 'accent', 'lightnessRange': [0.70, 0.85], 'name': 'syntax-number' },
    { 'chromaRange': [0.12, 0.24], 'derivedFrom': 'brand', 'hueOffset': 180, 'intent': 'accent', 'lightnessRange': [0.68, 0.82], 'name': 'syntax-function' },
    { 'chromaRange': [0.10, 0.22],     'derivedFrom': 'brand', 'hueOffset': 210, 'intent': 'accent', 'lightnessRange': [0.70, 0.84], 'name': 'syntax-type' }
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
    { 'chromaRange': [0.14, 0.26],   'derivedFrom': 'brand', 'hueOffset': 120, 'intent': 'accent', 'lightnessRange': [0.40, 0.52], 'name': 'syntax-string' },
    { 'chromaRange': [0.16, 0.28],   'derivedFrom': 'brand', 'hueOffset':  60, 'intent': 'accent', 'lightnessRange': [0.45, 0.58], 'name': 'syntax-number' },
    { 'chromaRange': [0.14, 0.26], 'derivedFrom': 'brand', 'hueOffset': 180, 'intent': 'accent', 'lightnessRange': [0.40, 0.52], 'name': 'syntax-function' },
    { 'chromaRange': [0.12, 0.22],     'derivedFrom': 'brand', 'hueOffset': 210, 'intent': 'accent', 'lightnessRange': [0.40, 0.52], 'name': 'syntax-type' }
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
    { 'chromaRange': [0.00, 0.03],  'derivedFrom': 'text', 'intent': 'text', 'lightnessRange': [0.92, 0.99], 'name': 'text-strong' },
    { 'chromaRange': [0.00, 0.04],  'derivedFrom': 'text', 'intent': 'muted', 'lightnessRange': [0.62, 0.74], 'name': 'text-subtle' },
    /* Interaction family: link/link-hover for anchors, focus-ring for a11y outlines. */
    { 'chromaRange': [0.14, 0.28],         'derivedFrom': 'brand',   'hueOffset': -15, 'intent': 'link', 'lightnessRange': [0.62, 0.78], 'name': 'link' },
    { 'chromaRange': [0.16, 0.30],   'derivedFrom': 'brand',   'hueOffset': -15, 'intent': 'link', 'lightnessRange': [0.72, 0.86], 'name': 'link-hover' },
    { 'chromaRange': [0.20, 0.34],   'derivedFrom': 'brand', 'intent': 'accent', 'lightnessRange': [0.60, 0.75], 'name': 'focus-ring' },
    /* Chrome variants: overlays, alternate borders, code surfaces. */
    { 'chromaRange': [0.00, 0.04],      'intent': 'background', 'lightnessRange': [0.02, 0.10], 'name': 'overlay' },
    { 'chromaRange': [0.00, 0.06],       'derivedFrom': 'divider',      'intent': 'muted', 'lightnessRange': [0.22, 0.34], 'name': 'border' },
    { 'chromaRange': [0.00, 0.08],'derivedFrom': 'divider',      'intent': 'muted', 'lightnessRange': [0.32, 0.46], 'name': 'border-strong' },
    { 'chromaRange': [0.00, 0.04],      'derivedFrom': 'bg-soft', 'intent': 'background', 'lightnessRange': [0.08, 0.16], 'name': 'code-bg' },
    /* Status family: info completes the warning/error/success quadrant. */
    { 'chromaRange': [0.16, 0.28],         'derivedFrom': 'brand', 'hueOffset': -60, 'intent': 'accent', 'lightnessRange': [0.55, 0.72], 'name': 'info' },
    /* Secondary accent: pairs with brand for two-color emphasis. */
    { 'chromaRange': [0.14, 0.26],   'derivedFrom': 'brand', 'hueOffset': 150, 'intent': 'accent', 'lightnessRange': [0.58, 0.74], 'name': 'accent-alt' },
    /* Extended syntax: comment / tag / attribute / operator / class / punctuation. */
    { 'chromaRange': [0.00, 0.06],     'derivedFrom': 'muted',  'intent': 'muted', 'lightnessRange': [0.48, 0.60], 'name': 'syntax-comment' },
    { 'chromaRange': [0.14, 0.26],         'derivedFrom': 'brand', 'hueOffset': 240, 'intent': 'accent', 'lightnessRange': [0.68, 0.82], 'name': 'syntax-tag' },
    { 'chromaRange': [0.12, 0.24],   'derivedFrom': 'brand', 'hueOffset': 270, 'intent': 'accent', 'lightnessRange': [0.68, 0.82], 'name': 'syntax-attribute' },
    { 'chromaRange': [0.10, 0.22],    'derivedFrom': 'brand', 'hueOffset': 300, 'intent': 'accent', 'lightnessRange': [0.70, 0.84], 'name': 'syntax-operator' },
    { 'chromaRange': [0.14, 0.26],       'derivedFrom': 'brand', 'hueOffset':  30, 'intent': 'accent', 'lightnessRange': [0.70, 0.84], 'name': 'syntax-class' },
    { 'chromaRange': [0.00, 0.08], 'derivedFrom': 'muted',  'intent': 'muted', 'lightnessRange': [0.58, 0.72], 'name': 'syntax-punctuation' }
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
    { 'chromaRange': [0.00, 0.04],  'derivedFrom': 'text', 'intent': 'text', 'lightnessRange': [0.04, 0.12], 'name': 'text-strong' },
    { 'chromaRange': [0.00, 0.05],  'derivedFrom': 'text', 'intent': 'muted', 'lightnessRange': [0.32, 0.46], 'name': 'text-subtle' },
    { 'chromaRange': [0.14, 0.28],         'derivedFrom': 'brand',   'hueOffset': -15, 'intent': 'link', 'lightnessRange': [0.36, 0.50], 'name': 'link' },
    { 'chromaRange': [0.16, 0.30],   'derivedFrom': 'brand',   'hueOffset': -15, 'intent': 'link', 'lightnessRange': [0.28, 0.42], 'name': 'link-hover' },
    { 'chromaRange': [0.20, 0.34],   'derivedFrom': 'brand', 'intent': 'accent', 'lightnessRange': [0.40, 0.58], 'name': 'focus-ring' },
    { 'chromaRange': [0.00, 0.03],      'intent': 'background', 'lightnessRange': [0.85, 0.94], 'name': 'overlay' },
    { 'chromaRange': [0.00, 0.05],       'derivedFrom': 'divider',      'intent': 'muted', 'lightnessRange': [0.72, 0.84], 'name': 'border' },
    { 'chromaRange': [0.00, 0.06],'derivedFrom': 'divider',      'intent': 'muted', 'lightnessRange': [0.60, 0.72], 'name': 'border-strong' },
    { 'chromaRange': [0.00, 0.03],      'derivedFrom': 'bg-soft', 'intent': 'background', 'lightnessRange': [0.92, 0.97], 'name': 'code-bg' },
    { 'chromaRange': [0.16, 0.28],         'derivedFrom': 'brand', 'hueOffset': -60, 'intent': 'accent', 'lightnessRange': [0.36, 0.50], 'name': 'info' },
    { 'chromaRange': [0.14, 0.26],   'derivedFrom': 'brand', 'hueOffset': 150, 'intent': 'accent', 'lightnessRange': [0.36, 0.50], 'name': 'accent-alt' },
    { 'chromaRange': [0.00, 0.06],     'derivedFrom': 'muted',  'intent': 'muted', 'lightnessRange': [0.45, 0.58], 'name': 'syntax-comment' },
    { 'chromaRange': [0.14, 0.26],         'derivedFrom': 'brand', 'hueOffset': 240, 'intent': 'accent', 'lightnessRange': [0.38, 0.52], 'name': 'syntax-tag' },
    { 'chromaRange': [0.12, 0.24],   'derivedFrom': 'brand', 'hueOffset': 270, 'intent': 'accent', 'lightnessRange': [0.38, 0.52], 'name': 'syntax-attribute' },
    { 'chromaRange': [0.10, 0.22],    'derivedFrom': 'brand', 'hueOffset': 300, 'intent': 'accent', 'lightnessRange': [0.40, 0.52], 'name': 'syntax-operator' },
    { 'chromaRange': [0.14, 0.26],       'derivedFrom': 'brand', 'hueOffset':  30, 'intent': 'accent', 'lightnessRange': [0.38, 0.52], 'name': 'syntax-class' },
    { 'chromaRange': [0.00, 0.08], 'derivedFrom': 'muted',  'intent': 'muted', 'lightnessRange': [0.40, 0.55], 'name': 'syntax-punctuation' }
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
