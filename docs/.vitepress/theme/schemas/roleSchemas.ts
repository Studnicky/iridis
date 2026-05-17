/**
 * roleSchemas.ts
 *
 * Built-in iridis role schemas for the docs site. Each tier is a superset
 * of the previous (4 ⊂ 8 ⊂ 12 ⊂ 16 ⊂ 32), so picking a smaller tier
 * produces a sparser palette and the docs page paints with fewer tokens
 * — that sparseness IS the demonstration of what each schema gives you.
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

import type { RoleSchemaInterface } from '@studnicky/iridis/model';

/* ─── iridis-4 ─────────────────────────────────────────────────────── */

const iridis4Dark: RoleSchemaInterface = {
  'name':        'iridis-4-dark',
  'description': 'Minimal four-role schema (dark framing). Background, text, brand, muted.',
  'roles': [
    { 'name': 'background', 'intent': 'background', 'required': true, 'lightnessRange': [0.04, 0.14], 'chromaRange': [0.00, 0.04] },
    { 'name': 'text',       'intent': 'text',       'required': true, 'lightnessRange': [0.85, 0.96], 'chromaRange': [0.00, 0.04] },
    { 'name': 'brand',      'intent': 'accent',     'required': true, 'lightnessRange': [0.55, 0.78], 'chromaRange': [0.12, 0.30] },
    { 'name': 'muted',      'intent': 'muted',                        'lightnessRange': [0.50, 0.68], 'chromaRange': [0.00, 0.06] },
  ],
  'contrastPairs': [
    { 'foreground': 'text',  'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'brand', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'muted', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

const iridis4Light: RoleSchemaInterface = {
  'name':        'iridis-4-light',
  'description': 'Minimal four-role schema (light framing). Background, text, brand, muted.',
  'roles': [
    { 'name': 'background', 'intent': 'background', 'required': true, 'lightnessRange': [0.94, 0.99], 'chromaRange': [0.00, 0.03] },
    { 'name': 'text',       'intent': 'text',       'required': true, 'lightnessRange': [0.10, 0.22], 'chromaRange': [0.00, 0.04] },
    { 'name': 'brand',      'intent': 'accent',     'required': true, 'lightnessRange': [0.40, 0.58], 'chromaRange': [0.14, 0.32] },
    { 'name': 'muted',      'intent': 'muted',                        'lightnessRange': [0.40, 0.55], 'chromaRange': [0.00, 0.06] },
  ],
  'contrastPairs': [
    { 'foreground': 'text',  'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'brand', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'muted', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

/* ─── iridis-8 ─────────────────────────────────────────────────────── */

const iridis8Dark: RoleSchemaInterface = {
  'name':        'iridis-8-dark',
  'description': 'Eight-role schema (dark framing). Adds surface, bgSoft, divider, onBrand.',
  'roles': [
    ...iridis4Dark.roles,
    { 'name': 'surface',  'intent': 'background', 'required': true, 'derivedFrom': 'background', 'lightnessRange': [0.08, 0.18], 'chromaRange': [0.00, 0.06] },
    { 'name': 'bg-soft',  'intent': 'background', 'derivedFrom': 'background', 'lightnessRange': [0.10, 0.22], 'chromaRange': [0.00, 0.08] },
    { 'name': 'divider',  'intent': 'muted',      'derivedFrom': 'background', 'lightnessRange': [0.18, 0.32], 'chromaRange': [0.00, 0.06] },
    { 'name': 'on-brand', 'intent': 'text',       'required': true, 'derivedFrom': 'brand',      'lightnessRange': [0.04, 0.14], 'chromaRange': [0.00, 0.02] },
  ],
  'contrastPairs': [
    ...(iridis4Dark.contrastPairs ?? []),
    { 'foreground': 'text',     'background': 'surface',    'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'text',     'background': 'bg-soft',    'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'on-brand', 'background': 'brand',      'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'divider',  'background': 'background', 'minRatio': 3.0, 'algorithm': 'wcag21' },
  ],
};

const iridis8Light: RoleSchemaInterface = {
  'name':        'iridis-8-light',
  'description': 'Eight-role schema (light framing). Adds surface, bg-soft, divider, on-brand.',
  'roles': [
    ...iridis4Light.roles,
    { 'name': 'surface',  'intent': 'background', 'required': true, 'derivedFrom': 'background', 'lightnessRange': [0.88, 0.96], 'chromaRange': [0.00, 0.04] },
    { 'name': 'bg-soft',  'intent': 'background', 'derivedFrom': 'background', 'lightnessRange': [0.90, 0.98], 'chromaRange': [0.00, 0.04] },
    { 'name': 'divider',  'intent': 'muted',      'derivedFrom': 'background', 'lightnessRange': [0.72, 0.86], 'chromaRange': [0.00, 0.04] },
    { 'name': 'on-brand', 'intent': 'text',       'required': true, 'derivedFrom': 'brand',      'lightnessRange': [0.97, 1.00], 'chromaRange': [0.00, 0.02] },
  ],
  'contrastPairs': [
    ...(iridis4Light.contrastPairs ?? []),
    { 'foreground': 'text',     'background': 'surface',    'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'text',     'background': 'bg-soft',    'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'on-brand', 'background': 'brand',      'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'divider',  'background': 'background', 'minRatio': 3.0, 'algorithm': 'wcag21' },
  ],
};

/* ─── iridis-12 ────────────────────────────────────────────────────── */

const iridis12Dark: RoleSchemaInterface = {
  'name':        'iridis-12-dark',
  'description': 'Twelve-role schema (dark framing). Adds success, warning, error, syntaxKeyword.',
  'roles': [
    ...iridis8Dark.roles,
    { 'name': 'success',       'intent': 'positive', 'derivedFrom': 'brand', 'lightnessRange': [0.65, 0.78], 'chromaRange': [0.14, 0.28], 'hueOffset': 120 },
    { 'name': 'warning',       'intent': 'positive', 'derivedFrom': 'brand', 'lightnessRange': [0.70, 0.82], 'chromaRange': [0.16, 0.28], 'hueOffset':  85 },
    { 'name': 'error',         'intent': 'critical',                          'lightnessRange': [0.62, 0.76], 'chromaRange': [0.18, 0.30] },
    { 'name': 'syntax-keyword', 'intent': 'accent',   'derivedFrom': 'brand', 'lightnessRange': [0.68, 0.82], 'chromaRange': [0.14, 0.28] },
  ],
  'contrastPairs': [
    ...(iridis8Dark.contrastPairs ?? []),
    { 'foreground': 'success',       'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'warning',       'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'error',         'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-keyword', 'background': 'bg-soft',     'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

const iridis12Light: RoleSchemaInterface = {
  'name':        'iridis-12-light',
  'description': 'Twelve-role schema (light framing). Adds success, warning, error, syntaxKeyword.',
  'roles': [
    ...iridis8Light.roles,
    { 'name': 'success',       'intent': 'positive', 'derivedFrom': 'brand', 'lightnessRange': [0.40, 0.52], 'chromaRange': [0.16, 0.30], 'hueOffset': 120 },
    { 'name': 'warning',       'intent': 'positive', 'derivedFrom': 'brand', 'lightnessRange': [0.50, 0.62], 'chromaRange': [0.18, 0.30], 'hueOffset':  85 },
    { 'name': 'error',         'intent': 'critical',                          'lightnessRange': [0.40, 0.55], 'chromaRange': [0.20, 0.32] },
    { 'name': 'syntax-keyword', 'intent': 'accent',   'derivedFrom': 'brand', 'lightnessRange': [0.42, 0.56], 'chromaRange': [0.16, 0.30] },
  ],
  'contrastPairs': [
    ...(iridis8Light.contrastPairs ?? []),
    { 'foreground': 'success',       'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'warning',       'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'error',         'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-keyword', 'background': 'bg-soft',     'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

/* ─── iridis-16 ────────────────────────────────────────────────────── */

const iridis16Dark: RoleSchemaInterface = {
  'name':        'iridis-16-dark',
  'description': 'Full sixteen-role schema (dark framing). Complete chrome + status + syntax theme.',
  'roles': [
    ...iridis12Dark.roles,
    { 'name': 'syntax-string',   'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.70, 0.85], 'chromaRange': [0.14, 0.26], 'hueOffset': 120 },
    { 'name': 'syntax-number',   'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.70, 0.85], 'chromaRange': [0.14, 0.28], 'hueOffset':  60 },
    { 'name': 'syntax-function', 'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.68, 0.82], 'chromaRange': [0.12, 0.24], 'hueOffset': 180 },
    { 'name': 'syntax-type',     'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.70, 0.84], 'chromaRange': [0.10, 0.22], 'hueOffset': 210 },
  ],
  'contrastPairs': [
    ...(iridis12Dark.contrastPairs ?? []),
    { 'foreground': 'syntax-string',   'background': 'bg-soft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-number',   'background': 'bg-soft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-function', 'background': 'bg-soft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-type',     'background': 'bg-soft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

const iridis16Light: RoleSchemaInterface = {
  'name':        'iridis-16-light',
  'description': 'Full sixteen-role schema (light framing). Complete chrome + status + syntax theme.',
  'roles': [
    ...iridis12Light.roles,
    { 'name': 'syntax-string',   'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.40, 0.52], 'chromaRange': [0.14, 0.26], 'hueOffset': 120 },
    { 'name': 'syntax-number',   'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.45, 0.58], 'chromaRange': [0.16, 0.28], 'hueOffset':  60 },
    { 'name': 'syntax-function', 'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.40, 0.52], 'chromaRange': [0.14, 0.26], 'hueOffset': 180 },
    { 'name': 'syntax-type',     'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.40, 0.52], 'chromaRange': [0.12, 0.22], 'hueOffset': 210 },
  ],
  'contrastPairs': [
    ...(iridis12Light.contrastPairs ?? []),
    { 'foreground': 'syntax-string',   'background': 'bg-soft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-number',   'background': 'bg-soft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-function', 'background': 'bg-soft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-type',     'background': 'bg-soft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

/* ─── iridis-32 ────────────────────────────────────────────────────── */

/* Sixteen-role tier extended with emphasis tiers, interaction colors,
   chrome variants, and the full editor-style syntax family. Mirrors
   the conceptual surface that large-scale design systems (vscode,
   ide themes, full chrome+code+status surfaces) consume. */

const iridis32Dark: RoleSchemaInterface = {
  'name':        'iridis-32-dark',
  'description': 'Thirty-two-role schema (dark framing). Adds emphasis tiers, interaction colors, chrome variants, and extended syntax tokens.',
  'roles': [
    ...iridis16Dark.roles,
    /* Emphasis tiers — text-strong reads as primary headings, text-subtle as captions / metadata. */
    { 'name': 'text-strong',  'intent': 'text', 'derivedFrom': 'text', 'lightnessRange': [0.92, 0.99], 'chromaRange': [0.00, 0.03] },
    { 'name': 'text-subtle',  'intent': 'muted', 'derivedFrom': 'text', 'lightnessRange': [0.62, 0.74], 'chromaRange': [0.00, 0.04] },
    /* Interaction family — link/link-hover for anchors, focus-ring for a11y outlines. */
    { 'name': 'link',         'intent': 'link',   'derivedFrom': 'brand', 'lightnessRange': [0.62, 0.78], 'chromaRange': [0.14, 0.28], 'hueOffset': -15 },
    { 'name': 'link-hover',   'intent': 'link',   'derivedFrom': 'brand', 'lightnessRange': [0.72, 0.86], 'chromaRange': [0.16, 0.30], 'hueOffset': -15 },
    { 'name': 'focus-ring',   'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.60, 0.75], 'chromaRange': [0.20, 0.34] },
    /* Chrome variants — overlays, alternate borders, code surfaces. */
    { 'name': 'overlay',      'intent': 'background', 'lightnessRange': [0.02, 0.10], 'chromaRange': [0.00, 0.04] },
    { 'name': 'border',       'intent': 'muted',      'derivedFrom': 'divider', 'lightnessRange': [0.22, 0.34], 'chromaRange': [0.00, 0.06] },
    { 'name': 'border-strong','intent': 'muted',      'derivedFrom': 'divider', 'lightnessRange': [0.32, 0.46], 'chromaRange': [0.00, 0.08] },
    { 'name': 'code-bg',      'intent': 'background', 'derivedFrom': 'bg-soft', 'lightnessRange': [0.08, 0.16], 'chromaRange': [0.00, 0.04] },
    /* Status family — info completes the warning/error/success quadrant. */
    { 'name': 'info',         'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.55, 0.72], 'chromaRange': [0.16, 0.28], 'hueOffset': -60 },
    /* Secondary accent — pairs with brand for two-color emphasis. */
    { 'name': 'accent-alt',   'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.58, 0.74], 'chromaRange': [0.14, 0.26], 'hueOffset': 150 },
    /* Extended syntax — comment / tag / attribute / operator / class / punctuation. */
    { 'name': 'syntax-comment',     'intent': 'muted',  'derivedFrom': 'muted', 'lightnessRange': [0.48, 0.60], 'chromaRange': [0.00, 0.06] },
    { 'name': 'syntax-tag',         'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.68, 0.82], 'chromaRange': [0.14, 0.26], 'hueOffset': 240 },
    { 'name': 'syntax-attribute',   'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.68, 0.82], 'chromaRange': [0.12, 0.24], 'hueOffset': 270 },
    { 'name': 'syntax-operator',    'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.70, 0.84], 'chromaRange': [0.10, 0.22], 'hueOffset': 300 },
    { 'name': 'syntax-class',       'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.70, 0.84], 'chromaRange': [0.14, 0.26], 'hueOffset':  30 },
    { 'name': 'syntax-punctuation', 'intent': 'muted',  'derivedFrom': 'muted', 'lightnessRange': [0.58, 0.72], 'chromaRange': [0.00, 0.08] },
  ],
  'contrastPairs': [
    ...(iridis16Dark.contrastPairs ?? []),
    { 'foreground': 'text-strong', 'background': 'background', 'minRatio': 7.0, 'algorithm': 'wcag21' },
    { 'foreground': 'text-subtle', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'link',        'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'link-hover',  'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'info',        'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'accent-alt',  'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-tag',         'background': 'code-bg', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-attribute',   'background': 'code-bg', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-operator',    'background': 'code-bg', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-class',       'background': 'code-bg', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-comment',     'background': 'code-bg', 'minRatio': 3.0, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-punctuation', 'background': 'code-bg', 'minRatio': 3.0, 'algorithm': 'wcag21' },
  ],
};

const iridis32Light: RoleSchemaInterface = {
  'name':        'iridis-32-light',
  'description': 'Thirty-two-role schema (light framing). Adds emphasis tiers, interaction colors, chrome variants, and extended syntax tokens.',
  'roles': [
    ...iridis16Light.roles,
    { 'name': 'text-strong',  'intent': 'text', 'derivedFrom': 'text', 'lightnessRange': [0.04, 0.12], 'chromaRange': [0.00, 0.04] },
    { 'name': 'text-subtle',  'intent': 'muted', 'derivedFrom': 'text', 'lightnessRange': [0.32, 0.46], 'chromaRange': [0.00, 0.05] },
    { 'name': 'link',         'intent': 'link',   'derivedFrom': 'brand', 'lightnessRange': [0.36, 0.50], 'chromaRange': [0.14, 0.28], 'hueOffset': -15 },
    { 'name': 'link-hover',   'intent': 'link',   'derivedFrom': 'brand', 'lightnessRange': [0.28, 0.42], 'chromaRange': [0.16, 0.30], 'hueOffset': -15 },
    { 'name': 'focus-ring',   'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.40, 0.58], 'chromaRange': [0.20, 0.34] },
    { 'name': 'overlay',      'intent': 'background', 'lightnessRange': [0.85, 0.94], 'chromaRange': [0.00, 0.03] },
    { 'name': 'border',       'intent': 'muted',      'derivedFrom': 'divider', 'lightnessRange': [0.72, 0.84], 'chromaRange': [0.00, 0.05] },
    { 'name': 'border-strong','intent': 'muted',      'derivedFrom': 'divider', 'lightnessRange': [0.60, 0.72], 'chromaRange': [0.00, 0.06] },
    { 'name': 'code-bg',      'intent': 'background', 'derivedFrom': 'bg-soft', 'lightnessRange': [0.92, 0.97], 'chromaRange': [0.00, 0.03] },
    { 'name': 'info',         'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.36, 0.50], 'chromaRange': [0.16, 0.28], 'hueOffset': -60 },
    { 'name': 'accent-alt',   'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.36, 0.50], 'chromaRange': [0.14, 0.26], 'hueOffset': 150 },
    { 'name': 'syntax-comment',     'intent': 'muted',  'derivedFrom': 'muted', 'lightnessRange': [0.45, 0.58], 'chromaRange': [0.00, 0.06] },
    { 'name': 'syntax-tag',         'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.38, 0.52], 'chromaRange': [0.14, 0.26], 'hueOffset': 240 },
    { 'name': 'syntax-attribute',   'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.38, 0.52], 'chromaRange': [0.12, 0.24], 'hueOffset': 270 },
    { 'name': 'syntax-operator',    'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.40, 0.52], 'chromaRange': [0.10, 0.22], 'hueOffset': 300 },
    { 'name': 'syntax-class',       'intent': 'accent', 'derivedFrom': 'brand', 'lightnessRange': [0.38, 0.52], 'chromaRange': [0.14, 0.26], 'hueOffset':  30 },
    { 'name': 'syntax-punctuation', 'intent': 'muted',  'derivedFrom': 'muted', 'lightnessRange': [0.40, 0.55], 'chromaRange': [0.00, 0.08] },
  ],
  'contrastPairs': [
    ...(iridis16Light.contrastPairs ?? []),
    { 'foreground': 'text-strong', 'background': 'background', 'minRatio': 7.0, 'algorithm': 'wcag21' },
    { 'foreground': 'text-subtle', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'link',        'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'link-hover',  'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'info',        'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'accent-alt',  'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-tag',         'background': 'code-bg', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-attribute',   'background': 'code-bg', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-operator',    'background': 'code-bg', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-class',       'background': 'code-bg', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-comment',     'background': 'code-bg', 'minRatio': 3.0, 'algorithm': 'wcag21' },
    { 'foreground': 'syntax-punctuation', 'background': 'code-bg', 'minRatio': 3.0, 'algorithm': 'wcag21' },
  ],
};

/* ─── Public registry ─────────────────────────────────────────────── */

/** Built-in schema-tier identifiers; the registry also accepts
 *  dispatcher-published `custom-<timestamp>` entries authored via the
 *  RoleSchemaEditor. The map's key type is widened to `string` to admit
 *  those custom entries; built-in tier names remain the canonical default
 *  set. */
export type SchemaName = 'iridis-4' | 'iridis-8' | 'iridis-12' | 'iridis-16' | 'iridis-32';

export interface SchemaPair {
  'dark':  RoleSchemaInterface;
  'light': RoleSchemaInterface;
}

export const roleSchemaByName: Record<string, SchemaPair> = {
  'iridis-4':  { 'dark': iridis4Dark,  'light': iridis4Light  },
  'iridis-8':  { 'dark': iridis8Dark,  'light': iridis8Light  },
  'iridis-12': { 'dark': iridis12Dark, 'light': iridis12Light },
  'iridis-16': { 'dark': iridis16Dark, 'light': iridis16Light },
  'iridis-32': { 'dark': iridis32Dark, 'light': iridis32Light },
};
