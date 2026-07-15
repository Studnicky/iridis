import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

/** Art-gallery minimalism — ambient background fully off, no blobs, grid, or particles at all. Visual (fonts/radius/border) lives in ./gallery.css. */
export const gallery: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       0,
    'gooEnabled':      false,
    'gridEnabled':     false,
    'particleCounts':  [0, 0, 0, 0, 0],
    'particleShape':   'dot',
    'speedMultiplier': 3
  },
  'dataLayout': 'list',
  'key':   'gallery',
  'label': 'Gallery'
};
