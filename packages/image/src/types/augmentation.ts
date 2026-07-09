// Image plugin type definitions.
// Each output slot is a flat top-level key on state.metadata.
// Plugin tasks read config from state.metadata['gallery'] (input bag)
// and write output to colon-namespaced flat slots.

import type { ColorRecordInterfaceType } from '@studnicky/iridis';

/**
 * Algorithm selector for `gallery:extract`.
 */
export type GalleryAlgorithmType = 'median-cut' | 'delta-e';

/**
 * Output written to state.metadata['gallery:histogram'] by gallery:histogram.
 */
export type GalleryHistogramSlotInterfaceType = {
  'binCount':    number;
  'bins':        { 'hex': string; 'weight': number }[];
  'totalPixels': number;
};

/**
 * Output written to state.metadata['gallery:harmonizeDetails'] by gallery:harmonize
 * when a hue shift is applied.
 */
export type GalleryHarmonizeDetailsInterfaceType = {
  'after':    string;
  'before':   string;
  'deltaE':   number;
  'hueShift': number;
};

/**
 * Output written to state.metadata['gallery:dominantColors'] by gallery:extract.
 */
export type GalleryDominantColorsSlotType = ColorRecordInterfaceType[];
