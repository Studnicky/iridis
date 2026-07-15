import type { GalleryAlgorithmType, GalleryCandidateInterfaceType, GalleryHistogramSlotInterfaceType } from '@studnicky/iridis-image/types';

/**
 * One uploaded image's own extraction state — decoded and reduced to
 * dominant colors independently of every other uploaded image, with its own
 * algorithm/k/histogram/range settings. `histogram` and `dominantColorRecords`
 * are this image's own Stage-1 extraction result (gallery:histogram /
 * gallery:extract run against ONLY this image's pixels); the combine stage
 * concatenates every entry's `dominantColorRecords` into the final palette.
 */
export type UploadedImageInterfaceType = {
  'algorithm': GalleryAlgorithmType;
  'candidates': GalleryCandidateInterfaceType[];
  'chromaRange': [number, number][];
  'deltaECap': number;
  /** Each color plus its cluster weight (pixel-count share), preserved from gallery:extract's ColorRecord.hints.weight so the combine stage can build a genuinely cumulative, pixel-weighted merge instead of treating every representative color as equally significant. */
  'dominantColorRecords': { 'hex': string; 'weight': number }[];
  'harmonizeThreshold': number;
  'histogram': GalleryHistogramSlotInterfaceType['bins'];
  'histogramBits': number;
  'id': string;
  'k': number;
  'lightnessRange': [number, number][];
  'name': string;
  'selectedCandidateLabel': string | null;
  'src': string;
};
