import type { ThemeDefinitionInterface } from '../ThemeDefinitionInterface.ts';

import { DataLayoutStrategy } from '../DataLayoutStrategy.ts';
import { renderBubble } from '../particles/renderBubble.ts';

/** Energetic tech/SaaS — rising bubble energy, no grid, brisk pace. The lava-lamp goo wash is Futuristic's own signature effect now; the bubbles alone carry Startup's "rising energy" vibe. Visual (fonts/radius/border) lives in ./startup.css. */
export const startup: ThemeDefinitionInterface = {
  'ambient': {
    'blobCount': 0,
    'gooBlurPx': 0,
    'gridDisplay': 'none',
    'particleCounts': [
      80,
      80,
      70,
      40,
      40
    ],
    'particleRenderer': renderBubble,
    'speedMultiplier': 0.7
  },
  'dataLayout': DataLayoutStrategy.grid,
  'key': 'startup',
  'label': 'Startup'
};
