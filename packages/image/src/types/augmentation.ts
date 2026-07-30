// Image plugin type definitions.
// Each output slot is a flat top-level key on state.metadata.
// Plugin tasks read config from state.metadata['gallery'] (input bag)
// and write output to colon-namespaced flat slots.

import type { ColorRecordInterfaceType } from '@studnicky/iridis';

/**
 * Algorithm selector for `gallery:extract`.
 */
export type GalleryAlgorithmType = 'median-cut' | 'delta-e' | 'k-means' | 'wu-quantize';

/**
 * Output written to state.metadata['gallery:histogram'] by gallery:histogram.
 */
export abstract class GalleryHistogramSlotInterfaceType {
  abstract 'binCount': number;
  abstract 'bins': { 'hex': string; 'weight': number }[];
  abstract 'totalPixels': number;
}

/**
 * Output written to state.metadata['gallery:harmonizeDetails'] by gallery:harmonize
 * when a hue shift is applied.
 */
export abstract class GalleryHarmonizeDetailsInterfaceType {
  abstract 'after': string;
  abstract 'before': string;
  abstract 'deltaE': number;
  abstract 'hueShift': number;
}

/**
 * Output written to state.metadata['gallery:dominantColors'] by gallery:extract.
 */
export abstract class GalleryDominantColorsSlotType extends Array<ColorRecordInterfaceType> {}

/**
 * One labeled candidate palette produced by `gallery:extractCandidates`.
 */
export abstract class GalleryCandidateInterfaceType {
  abstract 'algorithm': GalleryAlgorithmType;
  abstract 'colors': ColorRecordInterfaceType[];
  abstract 'k': number;
  abstract 'label': string;
}

/**
 * Output written to state.metadata['gallery:candidates'] by gallery:extractCandidates.
 */
export abstract class GalleryCandidatesSlotType extends Array<GalleryCandidateInterfaceType> {}
