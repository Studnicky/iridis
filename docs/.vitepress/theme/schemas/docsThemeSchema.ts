/**
 * docsThemeSchema.ts
 *
 * Two iridis role schemas — one for dark framing, one for light — that
 * define every visible chrome token of the docs site. Tight OKLCH
 * lightnessRange / chromaRange per role guarantees readable, framing-
 * appropriate output regardless of the user's seed colors.
 *
 * Pattern adapted from vscode-arcade-blaster's paletteClamp.ts: per-token
 * clamp ranges that preserve the seed's hue but bound L and C into a
 * comfortable, contrast-safe envelope. Because these ranges are declared
 * via `lightnessRange` and `chromaRange` on each role, the engine's
 * required-role enforcement (resolve:roles → nudgeIntoRole) does the
 * clamping for us — the docs theme is itself an iridis palette.
 *
 * Roles
 *   background : page background
 *   surface    : raised surface (sidebar, cards)
 *   bgSoft     : code blocks, inline backgrounds
 *   divider    : subtle borders, dividers
 *   muted      : secondary text, hints
 *   text       : primary body text (high contrast)
 *   brand      : accent, links, primary buttons
 *   onBrand    : text on brand surfaces
 */

import type { RoleSchemaInterface } from '@studnicky/iridis/model';

export const docsThemeSchemaDark: RoleSchemaInterface = {
  'name':        'docs-dark',
  'description': 'Dark-framing clamp ranges for docs site chrome tokens',
  'roles': [
    { 'name': 'background', 'required': true, 'intent': 'base',    'lightnessRange': [0.05, 0.12], 'chromaRange': [0, 0.04] },
    { 'name': 'surface',    'required': true, 'intent': 'surface', 'lightnessRange': [0.10, 0.16], 'chromaRange': [0, 0.04] },
    { 'name': 'bgSoft',     'required': true,                       'lightnessRange': [0.14, 0.20], 'chromaRange': [0, 0.04] },
    { 'name': 'divider',    'required': true, 'intent': 'neutral', 'lightnessRange': [0.22, 0.30], 'chromaRange': [0, 0.04] },
    { 'name': 'muted',      'required': true, 'intent': 'muted',   'lightnessRange': [0.62, 0.74], 'chromaRange': [0, 0.04] },
    { 'name': 'text',       'required': true, 'intent': 'text',    'lightnessRange': [0.94, 0.99], 'chromaRange': [0, 0.03] },
    { 'name': 'brand',      'required': true, 'intent': 'accent',  'lightnessRange': [0.62, 0.78], 'chromaRange': [0.14, 0.28] },
    { 'name': 'onBrand',    'required': true, 'intent': 'text',    'derivedFrom': 'brand', 'lightnessRange': [0.96, 1.0], 'chromaRange': [0, 0.02] },
  ],
};

export const docsThemeSchemaLight: RoleSchemaInterface = {
  'name':        'docs-light',
  'description': 'Light-framing clamp ranges for docs site chrome tokens',
  'roles': [
    { 'name': 'background', 'required': true, 'intent': 'base',    'lightnessRange': [0.97, 1.0],  'chromaRange': [0, 0.02] },
    { 'name': 'surface',    'required': true, 'intent': 'surface', 'lightnessRange': [0.95, 0.98], 'chromaRange': [0, 0.02] },
    { 'name': 'bgSoft',     'required': true,                       'lightnessRange': [0.94, 0.97], 'chromaRange': [0, 0.03] },
    { 'name': 'divider',    'required': true, 'intent': 'neutral', 'lightnessRange': [0.86, 0.92], 'chromaRange': [0, 0.03] },
    { 'name': 'muted',      'required': true, 'intent': 'muted',   'lightnessRange': [0.42, 0.55], 'chromaRange': [0, 0.04] },
    { 'name': 'text',       'required': true, 'intent': 'text',    'lightnessRange': [0.10, 0.20], 'chromaRange': [0, 0.03] },
    { 'name': 'brand',      'required': true, 'intent': 'accent',  'lightnessRange': [0.42, 0.55], 'chromaRange': [0.12, 0.24] },
    { 'name': 'onBrand',    'required': true, 'intent': 'text',    'derivedFrom': 'brand', 'lightnessRange': [0.96, 1.0], 'chromaRange': [0, 0.02] },
  ],
};

export function docsThemeSchemaFor(framing: 'dark' | 'light'): RoleSchemaInterface {
  return framing === 'light' ? docsThemeSchemaLight : docsThemeSchemaDark;
}
