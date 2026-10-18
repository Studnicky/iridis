import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

import { DataLayoutStrategy } from '../DataLayoutStrategy.ts';
import { renderHeart } from '../particles/renderHeart.ts';

/** Elegant, romantic invitation — sparse drifting-petal ambient, unhurried pace. Visual (fonts/radius/border) lives in ./romance.css. */
export const romance: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       4,
    'gooFilter':       'none',
    'gridDisplay':     'none',
    'particleCounts':  [30, 30, 30, 15, 15],
    'particleRenderer': renderHeart,
    'speedMultiplier': 2.75
  },
  'dataLayout': DataLayoutStrategy.list,
  'key':   'romance',
  'label': 'Romance'
};
