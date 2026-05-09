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
  'description': 'Dark-framing clamp ranges for docs site chrome tokens + syntax tokens',
  'roles': [
    // Chrome
    { 'name': 'background', 'required': true, 'intent': 'base',    'lightnessRange': [0.05, 0.12], 'chromaRange': [0, 0.04] },
    { 'name': 'surface',    'required': true, 'intent': 'surface', 'lightnessRange': [0.10, 0.16], 'chromaRange': [0, 0.04] },
    { 'name': 'bgSoft',     'required': true,                       'lightnessRange': [0.14, 0.20], 'chromaRange': [0, 0.04] },
    { 'name': 'divider',    'required': true, 'intent': 'neutral', 'lightnessRange': [0.22, 0.30], 'chromaRange': [0, 0.04] },
    { 'name': 'muted',      'required': true, 'intent': 'muted',   'lightnessRange': [0.62, 0.74], 'chromaRange': [0, 0.04] },
    { 'name': 'text',       'required': true, 'intent': 'text',    'lightnessRange': [0.94, 0.99], 'chromaRange': [0, 0.03] },
    { 'name': 'brand',      'required': true, 'intent': 'accent',  'lightnessRange': [0.62, 0.78], 'chromaRange': [0.14, 0.28] },
    { 'name': 'onBrand',    'required': true, 'intent': 'text',    'derivedFrom': 'brand', 'lightnessRange': [0.96, 1.0], 'chromaRange': [0, 0.02] },
    // Syntax — derived from brand at offsets, kept in a high-readability band
    { 'name': 'syntaxText',        'required': true, 'derivedFrom': 'text',    'lightnessRange': [0.88, 0.96], 'chromaRange': [0, 0.03] },
    { 'name': 'syntaxComment',     'required': true, 'derivedFrom': 'muted',   'lightnessRange': [0.45, 0.58], 'chromaRange': [0, 0.03] },
    { 'name': 'syntaxKeyword',     'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.66, 0.78], 'chromaRange': [0.14, 0.24], 'hueOffset': 0 },
    { 'name': 'syntaxString',      'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.72, 0.82], 'chromaRange': [0.13, 0.22], 'hueOffset': 145 },
    { 'name': 'syntaxNumber',      'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.74, 0.84], 'chromaRange': [0.12, 0.20], 'hueOffset': 80  },
    { 'name': 'syntaxFunction',    'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.74, 0.84], 'chromaRange': [0.13, 0.22], 'hueOffset': 230 },
    { 'name': 'syntaxType',        'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.72, 0.82], 'chromaRange': [0.13, 0.22], 'hueOffset': 195 },
    { 'name': 'syntaxConstant',    'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.72, 0.82], 'chromaRange': [0.13, 0.22], 'hueOffset': 35  },
    { 'name': 'syntaxVariable',    'required': true, 'derivedFrom': 'text',    'lightnessRange': [0.86, 0.94], 'chromaRange': [0, 0.04] },
    { 'name': 'syntaxProperty',    'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.74, 0.82], 'chromaRange': [0.10, 0.18], 'hueOffset': 280 },
    { 'name': 'syntaxTag',         'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.72, 0.82], 'chromaRange': [0.13, 0.22], 'hueOffset': 0   },
    { 'name': 'syntaxPunctuation', 'required': true, 'derivedFrom': 'muted',   'lightnessRange': [0.55, 0.68], 'chromaRange': [0, 0.04] },
    { 'name': 'syntaxEscape',      'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.74, 0.84], 'chromaRange': [0.13, 0.22], 'hueOffset': 30  },
    { 'name': 'syntaxError',       'required': true,                            'lightnessRange': [0.62, 0.74], 'chromaRange': [0.18, 0.28], 'hueOffset': 25  },
  ],
  // Multi-criterion accessibility — each body-text pair declared under
  // BOTH WCAG 2.1 AAA (≥7) AND APCA (Lc ≥ 75). The engine satisfies
  // every declared pair via enforce:contrast nudging, so the resulting
  // palette can never be inaccessible regardless of seed input.
  'contrastPairs': [
    // Body-text: WCAG AAA + APCA Lc 75
    { 'foreground': 'text', 'background': 'background', 'minRatio': 7,  'algorithm': 'wcag21' },
    { 'foreground': 'text', 'background': 'background', 'minRatio': 75, 'algorithm': 'apca'   },
    { 'foreground': 'text', 'background': 'surface',    'minRatio': 7,  'algorithm': 'wcag21' },
    { 'foreground': 'text', 'background': 'surface',    'minRatio': 75, 'algorithm': 'apca'   },
    { 'foreground': 'text', 'background': 'bgSoft',     'minRatio': 7,  'algorithm': 'wcag21' },
    // Muted text: WCAG AA + APCA Lc 60 (large/non-body)
    { 'foreground': 'muted', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'muted', 'background': 'background', 'minRatio': 60,  'algorithm': 'apca'   },
    // Brand surfaces: AA + APCA Lc 60
    { 'foreground': 'onBrand', 'background': 'brand', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'onBrand', 'background': 'brand', 'minRatio': 60,  'algorithm': 'apca'   },
    // Syntax-vs-code-block: AA + APCA Lc 60 for the most common scopes
    { 'foreground': 'syntaxText',     'background': 'bgSoft', 'minRatio': 7,   'algorithm': 'wcag21' },
    { 'foreground': 'syntaxKeyword',  'background': 'bgSoft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntaxString',   'background': 'bgSoft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntaxFunction', 'background': 'bgSoft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntaxComment',  'background': 'bgSoft', 'minRatio': 3,   'algorithm': 'wcag21' },
    { 'foreground': 'syntaxError',    'background': 'bgSoft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

export const docsThemeSchemaLight: RoleSchemaInterface = {
  'name':        'docs-light',
  'description': 'Light-framing clamp ranges for docs site chrome tokens + syntax tokens',
  'roles': [
    // Chrome
    { 'name': 'background', 'required': true, 'intent': 'base',    'lightnessRange': [0.97, 1.0],  'chromaRange': [0, 0.02] },
    { 'name': 'surface',    'required': true, 'intent': 'surface', 'lightnessRange': [0.95, 0.98], 'chromaRange': [0, 0.02] },
    { 'name': 'bgSoft',     'required': true,                       'lightnessRange': [0.94, 0.97], 'chromaRange': [0, 0.03] },
    { 'name': 'divider',    'required': true, 'intent': 'neutral', 'lightnessRange': [0.86, 0.92], 'chromaRange': [0, 0.03] },
    { 'name': 'muted',      'required': true, 'intent': 'muted',   'lightnessRange': [0.42, 0.55], 'chromaRange': [0, 0.04] },
    { 'name': 'text',       'required': true, 'intent': 'text',    'lightnessRange': [0.10, 0.20], 'chromaRange': [0, 0.03] },
    { 'name': 'brand',      'required': true, 'intent': 'accent',  'lightnessRange': [0.42, 0.55], 'chromaRange': [0.12, 0.24] },
    { 'name': 'onBrand',    'required': true, 'intent': 'text',    'derivedFrom': 'brand', 'lightnessRange': [0.96, 1.0], 'chromaRange': [0, 0.02] },
    // Syntax — darker band for legibility against light bg
    { 'name': 'syntaxText',        'required': true, 'derivedFrom': 'text',    'lightnessRange': [0.10, 0.20], 'chromaRange': [0, 0.03] },
    { 'name': 'syntaxComment',     'required': true, 'derivedFrom': 'muted',   'lightnessRange': [0.42, 0.55], 'chromaRange': [0, 0.03] },
    { 'name': 'syntaxKeyword',     'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.34, 0.46], 'chromaRange': [0.14, 0.22], 'hueOffset': 0 },
    { 'name': 'syntaxString',      'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.36, 0.48], 'chromaRange': [0.13, 0.20], 'hueOffset': 145 },
    { 'name': 'syntaxNumber',      'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.38, 0.50], 'chromaRange': [0.12, 0.18], 'hueOffset': 80  },
    { 'name': 'syntaxFunction',    'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.38, 0.50], 'chromaRange': [0.13, 0.20], 'hueOffset': 230 },
    { 'name': 'syntaxType',        'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.36, 0.48], 'chromaRange': [0.13, 0.20], 'hueOffset': 195 },
    { 'name': 'syntaxConstant',    'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.36, 0.48], 'chromaRange': [0.13, 0.20], 'hueOffset': 35  },
    { 'name': 'syntaxVariable',    'required': true, 'derivedFrom': 'text',    'lightnessRange': [0.18, 0.28], 'chromaRange': [0, 0.04] },
    { 'name': 'syntaxProperty',    'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.36, 0.48], 'chromaRange': [0.10, 0.18], 'hueOffset': 280 },
    { 'name': 'syntaxTag',         'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.36, 0.48], 'chromaRange': [0.13, 0.20], 'hueOffset': 0   },
    { 'name': 'syntaxPunctuation', 'required': true, 'derivedFrom': 'muted',   'lightnessRange': [0.40, 0.55], 'chromaRange': [0, 0.04] },
    { 'name': 'syntaxEscape',      'required': true, 'derivedFrom': 'brand',   'lightnessRange': [0.38, 0.50], 'chromaRange': [0.13, 0.20], 'hueOffset': 30  },
    { 'name': 'syntaxError',       'required': true,                            'lightnessRange': [0.34, 0.46], 'chromaRange': [0.18, 0.28], 'hueOffset': 25  },
  ],
  // Same multi-criterion contract as dark — WCAG 2.1 AAA + APCA Lc 75
  // for body text, AA / Lc 60 for everything else, AA for the most-used
  // syntax scopes. The engine satisfies every declared pair.
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 7,  'algorithm': 'wcag21' },
    { 'foreground': 'text', 'background': 'background', 'minRatio': 75, 'algorithm': 'apca'   },
    { 'foreground': 'text', 'background': 'surface',    'minRatio': 7,  'algorithm': 'wcag21' },
    { 'foreground': 'text', 'background': 'surface',    'minRatio': 75, 'algorithm': 'apca'   },
    { 'foreground': 'text', 'background': 'bgSoft',     'minRatio': 7,  'algorithm': 'wcag21' },
    { 'foreground': 'muted', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'muted', 'background': 'background', 'minRatio': 60,  'algorithm': 'apca'   },
    { 'foreground': 'onBrand', 'background': 'brand', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'onBrand', 'background': 'brand', 'minRatio': 60,  'algorithm': 'apca'   },
    { 'foreground': 'syntaxText',     'background': 'bgSoft', 'minRatio': 7,   'algorithm': 'wcag21' },
    { 'foreground': 'syntaxKeyword',  'background': 'bgSoft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntaxString',   'background': 'bgSoft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntaxFunction', 'background': 'bgSoft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'syntaxComment',  'background': 'bgSoft', 'minRatio': 3,   'algorithm': 'wcag21' },
    { 'foreground': 'syntaxError',    'background': 'bgSoft', 'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

export function docsThemeSchemaFor(framing: 'dark' | 'light'): RoleSchemaInterface {
  return framing === 'light' ? docsThemeSchemaLight : docsThemeSchemaDark;
}
