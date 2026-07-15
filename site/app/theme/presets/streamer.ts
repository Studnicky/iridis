import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

/** Twitch/YouTube stream-overlay energy — bursting star particles plus a bottom-edge alert-glow pulse (./streamer.css), fastest pace of any theme. The lava-lamp goo wash is Futuristic's own signature effect now. Visual (fonts/radius/border) lives in ./streamer.css. */
export const streamer: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       0,
    'gooEnabled':      false,
    'gridEnabled':     false,
    'particleCounts':  [90, 90, 80, 45, 45],
    'particleShape':   'star',
    'speedMultiplier': 0.35
  },
  'dataLayout': 'pixel',
  'key':   'streamer',
  'label': 'Streamer'
};
