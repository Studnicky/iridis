import type { ThemeDefinitionInterface } from '../ThemeDefinitionInterface.ts';

import { DataLayoutStrategy } from '../DataLayoutStrategy.ts';
import { renderStar } from '../particles/renderStar.ts';

/** Twitch/YouTube stream-overlay energy — bursting star particles plus a bottom-edge alert-glow pulse (./streamer.css), fastest pace of any theme. The lava-lamp goo wash is Futuristic's own signature effect now. Visual (fonts/radius/border) lives in ./streamer.css. */
export const streamer: ThemeDefinitionInterface = {
  'ambient': {
    'blobCount':       0,
    'gooFilter':       'none',
    'gridDisplay':     'none',
    'particleCounts':  [90, 90, 80, 45, 45],
    'particleRenderer': renderStar,
    'speedMultiplier': 0.35
  },
  'dataLayout': DataLayoutStrategy.pixel,
  'key':   'streamer',
  'label': 'Streamer'
};
