/**
 * roleSchemas.ts
 *
 * Built-in iridis role schemas for the docs site. Each tier is a superset
 * of the previous (4 ⊂ 8 ⊂ 12 ⊂ 16), so picking a smaller tier produces
 * a sparser palette and the docs page paints with fewer tokens — that
 * sparseness IS the demonstration of what each schema gives you.
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

/* ─── Public registry ─────────────────────────────────────────────── */

/** Built-in schema-tier identifiers; the registry also accepts
 *  dispatcher-published `custom-<timestamp>` entries authored via the
 *  RoleSchemaEditor. The map's key type is widened to `string` to admit
 *  those custom entries; built-in tier names remain the canonical default
 *  set. */
export type SchemaName = 'iridis-4' | 'iridis-8' | 'iridis-12' | 'iridis-16';

export interface SchemaPair {
  'dark':  RoleSchemaInterface;
  'light': RoleSchemaInterface;
}

export const roleSchemaByName: Record<string, SchemaPair> = {
  'iridis-4':  { 'dark': iridis4Dark,  'light': iridis4Light  },
  'iridis-8':  { 'dark': iridis8Dark,  'light': iridis8Light  },
  'iridis-12': { 'dark': iridis12Dark, 'light': iridis12Light },
  'iridis-16': { 'dark': iridis16Dark, 'light': iridis16Light },
};
