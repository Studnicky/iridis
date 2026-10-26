import type { ThemeDefinitionInterface } from '../ThemeDefinitionInterface.ts';

import { DataLayoutStrategy } from '../DataLayoutStrategy.ts';
import { renderSquare } from '../particles/renderSquare.ts';

/** Rustic/farmers-market Americana — slow drifting dust-mote ambient, no blobs or grid. Visual (fonts/radius/border) lives in ./backroads.css. */
export const backroads: ThemeDefinitionInterface = {
  'ambient': {
    'blobCount': 6,
    'gooBlurPx': 0,
    'gridDisplay': 'none',
    'particleCounts': [
      40,
      40,
      30,
      20,
      20
    ],
    'particleRenderer': renderSquare,
    'speedMultiplier': 2.2
  },
  'dataLayout': DataLayoutStrategy.list,
  'key': 'backroads',
  'label': 'Backroads'
};
