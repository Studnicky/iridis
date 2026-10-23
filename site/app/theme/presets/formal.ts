import type { ThemeDefinitionInterface } from '../ThemeDefinitionInterface.ts';

import { DataLayoutStrategy } from '../DataLayoutStrategy.ts';
import { renderDot } from '../particles/renderDot.ts';

/**
 * Executive/business. A boardroom doesn't have rotating or flashing
 * particles drifting through it — no starfield, no blobs, no motion at all.
 * Visual (fonts/radius/border) lives in ./formal.css.
 */
export const formal: ThemeDefinitionInterface = {
  'ambient': {
    'blobCount':       0,
    'gooFilter':       'none',
    'gridDisplay':     'none',
    'particleCounts':  [0, 0, 0, 0, 0],
    'particleRenderer': renderDot,
    'speedMultiplier': 2.75
  },
  'dataLayout': DataLayoutStrategy.table,
  'key':   'formal',
  'label': 'Formal'
};
