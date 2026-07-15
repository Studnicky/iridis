import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

/** Rustic/farmers-market Americana — slow drifting dust-mote ambient, no blobs or grid. Visual (fonts/radius/border) lives in ./backroads.css. */
export const backroads: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       6,
    'gooEnabled':      false,
    'gridEnabled':     false,
    'particleCounts':  [40, 40, 30, 20, 20],
    'particleShape':   'square',
    'speedMultiplier': 2.2
  },
  'dataLayout': 'list',
  'key':   'backroads',
  'label': 'Backroads'
};
