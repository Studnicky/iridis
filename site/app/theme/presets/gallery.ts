import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

import { DataLayoutStrategy } from '../DataLayoutStrategy.ts';
import { renderDot } from '../particles/renderDot.ts';

/** Art-gallery minimalism — ambient background fully off, no blobs, grid, or particles at all. Visual (fonts/radius/border) lives in ./gallery.css. */
export const gallery: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       0,
    'gooFilter':       'none',
    'gridDisplay':     'none',
    'particleCounts':  [0, 0, 0, 0, 0],
    'particleRenderer': renderDot,
    'speedMultiplier': 3
  },
  'dataLayout': DataLayoutStrategy.list,
  'key':   'gallery',
  'label': 'Gallery'
};
