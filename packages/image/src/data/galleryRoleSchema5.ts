import type { RoleSchemaInterfaceType } from '@studnicky/iridis';

/**
 * Five-role schema for art-gallery chrome re-skinning.
 *
 * OKLCH ranges used:
 *   L: lightness  [0, 1]   (perceptual, roughly matches perceived brightness)
 *   C: chroma     [0, 0.5] (0 = neutral grey, ~0.4 = highly saturated)
 *   H: hue        [0, 360] (degrees; absent here, roles don't constrain hue)
 *
 * canvas: darkest neutral (page/frame background). L ≤ 0.40, very low chroma.
 * frame:  mid-luminance neutral (gallery moulding, border). 0.30 ≤ L ≤ 0.70.
 * accent: highest-chroma color (CTA, hover highlight). C ≥ 0.10.
 * muted:  low-chroma non-neutral (caption background, secondary UI). C ≤ 0.08.
 * text:   derived: white or black depending on canvas lightness.
 */
export const galleryRoleSchema5: RoleSchemaInterfaceType = {
  'contrastPairs': [
    {
      'algorithm':  'wcag21',
      'background': 'canvas',
      'foreground': 'text',
      'minRatio':   7.0
    },
    {
      'algorithm':  'wcag21',
      'background': 'frame',
      'foreground': 'text',
      'minRatio':   4.5
    },
    {
      'algorithm':  'wcag21',
      'background': 'canvas',
      'foreground': 'accent',
      'minRatio':   3.0
    }
  ],
  'description': 'Five-role palette for art-gallery web chrome re-skinning',
  'name':        'gallery-5',
  'roles': [
    {
      'chromaRange':    [0.0, 0.06],
      'description':    'Darkest neutral, page and frame background',
      'intent':         'background',
      'lightnessRange': [0.0, 0.40],
      'name':           'canvas',
      'required':       true
    },
    {
      'chromaRange':    [0.0, 0.10],
      'description':    'Mid-luminance neutral, gallery moulding and borders',
      'intent':         'muted',
      'lightnessRange': [0.30, 0.70],
      'name':           'frame',
      'required':       true
    },
    {
      'chromaRange':    [0.10, 0.40],
      'description':    'Highest-chroma color, call-to-action and hover highlight',
      'intent':         'accent',
      'lightnessRange': [0.30, 0.80],
      'name':           'accent',
      'required':       true
    },
    {
      'chromaRange':    [0.0, 0.08],
      'description':    'Low-chroma non-neutral, caption background and secondary UI',
      'intent':         'muted',
      'lightnessRange': [0.40, 0.85],
      'name':           'muted',
      'required':       true
    },
    {
      'chromaRange':    [0.0, 0.0],
      'derivedFrom':    'canvas',
      'description':    'Auto-derived: white when canvas is dark, black when canvas is light',
      'intent':         'text',
      'lightnessRange': [0.0, 1.0],
      'name':           'text',
      'required':       true
    }
  ]
};
