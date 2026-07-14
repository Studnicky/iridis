import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

/** Sci-fi default — dense twinkling starfield, gooey lava blobs, perspective grid floor. Visual (fonts/radius/border) lives in ./futuristic.css. */
export const futuristic: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       18,
    'gooEnabled':      true,
    'gridEnabled':     true,
    'particleCounts':  [200, 200, 200, 100, 100],
    'particleShape':   'dot',
    'speedMultiplier': 1
  },
  'dataLayout': 'grid',
  'key':   'futuristic',
  'label': 'Futuristic'
};
