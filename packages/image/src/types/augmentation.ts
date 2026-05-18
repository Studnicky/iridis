// Image plugin type definitions.
// Each output slot is a flat top-level key on state.metadata.
// Plugin tasks read config from state.metadata['gallery'] (input bag)
// and write output to colon-namespaced flat slots.

import type { ColorRecordInterface } from '@studnicky/iridis';

/**
 * Algorithm selector for `gallery:extract`.
 */
export type GalleryAlgorithmType = 'median-cut' | 'delta-e';

/**
 * Input configuration bag read from state.metadata['gallery'].
 * Set by callers before running the pipeline.
 */
export interface GalleryConfigInterface {
  'k'?:                  number;
  'algorithm'?:          GalleryAlgorithmType;
  'histogramBits'?:      number;
  'deltaECap'?:          number;
  'harmonizeThreshold'?: number;
  'lightnessRange'?:     readonly [number, number];
  'chromaRange'?:        readonly [number, number];
}

/**
 * Output written to state.metadata['gallery:histogram'] by gallery:histogram.
 */
export interface GalleryHistogramSlotInterface {
  readonly 'bins':        readonly { readonly 'hex': string; readonly 'weight': number }[];
  readonly 'totalPixels': number;
  readonly 'binCount':    number;
}

/**
 * Output written to state.metadata['gallery:harmonizeDetails'] by gallery:harmonize
 * when a hue shift is applied.
 */
export interface GalleryHarmonizeDetailsInterface {
  readonly 'before':   string;
  readonly 'after':    string;
  readonly 'deltaE':   number;
  readonly 'hueShift': number;
}

/**
 * Output written to state.metadata['gallery:dominantColors'] by gallery:extract.
 */
export type GalleryDominantColorsSlotType = ColorRecordInterface[];
