import type { ThemeDefinitionInterface } from '../ThemeDefinitionInterface.ts';

import { DataLayoutStrategy } from '../DataLayoutStrategy.ts';
import { renderDot } from '../particles/renderDot.ts';

/** Art-gallery minimalism — ambient background fully off, no blobs, grid, or particles at all. Visual (fonts/radius/border) lives in ./gallery.css. */
export const gallery: ThemeDefinitionInterface = {
  'ambient': {
    'blobCount': 0,
    'gooBlurPx': 0,
    'gridDisplay': 'none',
    'particleCounts': [
      0,
      0,
      0,
      0,
      0
    ],
    'particleRenderer': renderDot,
    'speedMultiplier': 3
  },
  'dataLayout': DataLayoutStrategy.list,
  'key': 'gallery',
  'label': 'Gallery'
};
