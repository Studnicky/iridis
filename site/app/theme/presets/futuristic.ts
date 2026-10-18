import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

import { DataLayoutStrategy } from '../DataLayoutStrategy.ts';
import { renderDot } from '../particles/renderDot.ts';

/** Sci-fi default — dense twinkling starfield, gooey lava blobs, perspective grid floor. Visual (fonts/radius/border) lives in ./futuristic.css. */
export const futuristic: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       18,
    'gooFilter':       'blur(28px)',
    'gridDisplay':     'block',
    'particleCounts':  [200, 200, 200, 100, 100],
    'particleRenderer': renderDot,
    'speedMultiplier': 1
  },
  'dataLayout': DataLayoutStrategy.grid,
  'key':   'futuristic',
  'label': 'Futuristic'
};
