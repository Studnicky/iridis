import type { ThemeDefinitionInterface } from '../ThemeDefinitionInterface.ts';

import { DataLayoutStrategy } from '../DataLayoutStrategy.ts';
import { renderHeart } from '../particles/renderHeart.ts';

/** Soft, bubbly, playful — no grid, bouncy pace, heart-shaped ambient particles. The lava-lamp goo wash is Futuristic's own signature effect now; the rising hearts alone carry Girlypop's bubbly vibe. Visual (fonts/radius/border) lives in ./girlypop.css. */
export const girlypop: ThemeDefinitionInterface = {
  'ambient': {
    'blobCount': 0,
    'gooBlurPx': 0,
    'gridDisplay': 'none',
    'particleCounts': [
      70,
      70,
      60,
      35,
      35
    ],
    'particleRenderer': renderHeart,
    'speedMultiplier': 0.8
  },
  'dataLayout': DataLayoutStrategy.pixel,
  'key': 'girlypop',
  'label': 'Girlypop'
};
