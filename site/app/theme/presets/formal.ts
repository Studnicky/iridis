import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

/**
 * Executive/business. A boardroom doesn't have rotating or flashing
 * particles drifting through it — no starfield, no blobs, no motion at all.
 * Visual (fonts/radius/border) lives in ./formal.css.
 */
export const formal: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       0,
    'gooEnabled':      false,
    'gridEnabled':     false,
    'particleCounts':  [0, 0, 0, 0, 0],
    'particleShape':   'dot',
    'speedMultiplier': 2.75
  },
  'dataLayout': 'table',
  'key':   'formal',
  'label': 'Formal'
};
