import type { RoleSchemaInterface } from '@studnicky/iridis';

/**
 * Five-role schema for art-gallery chrome re-skinning.
 *
 * OKLCH ranges used:
 *   L  — lightness  [0, 1]   (perceptual, roughly matches perceived brightness)
 *   C  — chroma     [0, 0.5] (0 = neutral grey, ~0.4 = highly saturated)
 *   H  — hue        [0, 360] (degrees; absent here — roles don't constrain hue)
 *
 * canvas  — darkest neutral (page/frame background). L ≤ 0.40, very low chroma.
 * frame   — mid-luminance neutral (gallery moulding, border). 0.30 ≤ L ≤ 0.70.
 * accent  — highest-chroma color (CTA, hover highlight). C ≥ 0.10.
 * muted   — low-chroma non-neutral (caption background, secondary UI). C ≤ 0.08.
 * text    — derived: white or black depending on canvas lightness.
 */
export const galleryRoleSchema5: RoleSchemaInterface = {
  'name':        'gallery-5',
  'description': 'Five-role palette for art-gallery web chrome re-skinning',
  'roles': [
    {
      'name':           'canvas',
      'description':    'Darkest neutral — page and frame background',
      'intent':         'surface',
      'required':       true,
      'lightnessRange': [0.0, 0.40],
      'chromaRange':    [0.0, 0.06],
    },
    {
      'name':           'frame',
      'description':    'Mid-luminance neutral — gallery moulding and borders',
      'intent':         'neutral',
      'required':       true,
      'lightnessRange': [0.30, 0.70],
      'chromaRange':    [0.0, 0.10],
    },
    {
      'name':           'accent',
      'description':    'Highest-chroma color — call-to-action and hover highlight',
      'intent':         'accent',
      'required':       true,
      'lightnessRange': [0.30, 0.80],
      'chromaRange':    [0.10, 0.40],
    },
    {
      'name':           'muted',
      'description':    'Low-chroma non-neutral — caption background and secondary UI',
      'intent':         'muted',
      'required':       true,
      'lightnessRange': [0.40, 0.85],
      'chromaRange':    [0.0, 0.08],
    },
    {
      'name':           'text',
      'description':    'Auto-derived: white when canvas is dark, black when canvas is light',
      'intent':         'text',
      'required':       true,
      'derivedFrom':    'canvas',
      'lightnessRange': [0.0, 1.0],
      'chromaRange':    [0.0, 0.0],
    },
  ],
  'contrastPairs': [
    {
      'foreground': 'text',
      'background': 'canvas',
      'minRatio':   7.0,
      'algorithm':  'wcag21',
    },
    {
      'foreground': 'text',
      'background': 'frame',
      'minRatio':   4.5,
      'algorithm':  'wcag21',
    },
    {
      'foreground': 'accent',
      'background': 'canvas',
      'minRatio':   3.0,
      'algorithm':  'wcag21',
    },
  ],
};
