// Lifted from vscode-arcade-blaster/dev/themes/tools/modifierTransforms.ts:34-100

/**
 * Transform parameters for each of the 10 VS Code semantic token modifiers.
 *
 * Design principles:
 *   declaration/definition  — Slightly brighter (being defined here)
 *   readonly                — Bold, slight tint toward constant
 *   static                  — Underlined, slightly desaturated (class-level, not instance)
 *   deprecated              — Strikethrough, heavily desaturated (don't use)
 *   abstract                — Italic, slightly ethereal
 *   async                   — Italic, hint of info color (async/await context)
 *   modification            — Bold, slightly warmer (being changed)
 *   documentation           — Italic, muted toward comment
 *   defaultLibrary          — Subtle, blend toward muted (built-in, not user code)
 */

import type { ModifierTransformInterface } from '../types/index.ts';

export const MODIFIER_TRANSFORMS: Readonly<Record<string, ModifierTransformInterface>> = {

  'abstract': {
    'fontStyle':   'italic',
    'lightness':    3,
    'saturation':  -8,
  },

  'async': {
    'fontStyle':   'italic',
    'mixWeight':    0.12,
    'mixWith':     'info',
  },

  'declaration': {
    'fontStyle':   'bold',
    'lightness':    5,
  },

  'defaultLibrary': {
    'lightness':   -5,
    'mixWeight':    0.15,
    'mixWith':     'muted',
    'saturation': -10,
  },

  'definition': {
    'fontStyle':   'bold',
    'lightness':    5,
  },

  'deprecated': {
    'fontStyle':   'strikethrough',
    'lightness':  -10,
    'mixWeight':    0.3,
    'mixWith':     'muted',
    'saturation': -40,
  },

  'documentation': {
    'fontStyle':   'italic',
    'mixWeight':    0.25,
    'mixWith':     'comment',
    'saturation': -15,
  },

  'modification': {
    'fontStyle':   'bold',
    'lightness':    3,
    'mixWeight':    0.1,
    'mixWith':     'warning',
    'saturation':   8,
  },

  'readonly': {
    'fontStyle':   'bold',
    'lightness':    8,
    'mixWeight':    0.15,
    'mixWith':     'constant',
    'saturation':  -5,
  },

  'static': {
    'fontStyle':   'underline',
    'saturation': -12,
  },

} as const;
