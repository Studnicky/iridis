import type { GalleryCandidateInterfaceType } from '@studnicky/iridis-image/types';

import type { GalleryAlgorithmType } from './galleryAlgorithm.ts';
import type { HistogramBinType } from './histogramBin.ts';

/**
 * One uploaded image's own extraction state — decoded and reduced to
 * dominant colors independently of every other uploaded image, with its own
 * algorithm/k/histogram/range settings. `histogram` and `dominantColors` are
 * this image's own Stage-1 extraction result (gallery:histogram / gallery:extract
 * run against ONLY this image's pixels); the combine stage concatenates every
 * entry's `dominantColors` into the final palette.
 */
export interface UploadedImageInterfaceType {
  algorithm: GalleryAlgorithmType;
  candidates: GalleryCandidateInterfaceType[];
  chromaRange: [number, number][];
  deltaECap: number;
  dominantColors: string[];
  /** Parallel to `dominantColors` (same index order) — each color's cluster weight (pixel-count share), preserved from gallery:extract's ColorRecord.hints.weight so the combine stage can build a genuinely cumulative, pixel-weighted merge instead of treating every representative color as equally significant. */
  dominantColorWeights: number[];
  harmonizeThreshold: number;
  histogram: HistogramBinType[];
  histogramBits: number;
  id: string;
  k: number;
  lightnessRange: [number, number][];
  name: string;
  selectedCandidateLabel: string | null;
  src: string;
}
