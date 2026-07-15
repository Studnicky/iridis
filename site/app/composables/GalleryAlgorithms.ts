import type { GalleryAlgorithmType } from './types/galleryAlgorithm.ts';

/** USelect options for the "Clustering algorithm" field — shared by every card that lets a user pick an image-extraction algorithm. Not `readonly` — Nuxt UI's `USelect` `:items` prop expects a mutable array type. */
export const ALGORITHM_ITEMS: { 'label': string; 'value': GalleryAlgorithmType }[] = [
  { 'label': 'ΔE (delta-e)', 'value': 'delta-e' },
  { 'label': 'Median cut', 'value': 'median-cut' },
  { 'label': 'Wu quantize', 'value': 'wu-quantize' },
  { 'label': 'K-means', 'value': 'k-means' }
];

/** Humanizes a raw gallery algorithm id into the label shown on a candidate/summary card. */
export const ALGORITHM_LABELS: Record<string, string> = {
  'delta-e':     'Delta-E merge',
  'k-means':     'K-means',
  'median-cut':  'Median cut',
  'wu-quantize': 'Wu quantize'
};

/** One-line "what is this and when would I pick it" for each clustering algorithm — shown under the select so the choice isn't just four unexplained names. */
export const ALGORITHM_HELP: Record<string, string> = {
  'delta-e':     'Agglomerative merging by perceptual color difference (ΔE2000). Tends to keep small but visually distinct colors that box-splitting algorithms merge away.',
  'median-cut':  'Recursive box splitting at the median of the widest channel. Fast, one-shot, the long-standing default — but a median split can bisect a small distinct cluster.',
  'wu-quantize': 'Recursive box splitting like median cut, but each split lands where it minimizes total clustering error instead of at the median. One-shot, usually a better split than median cut for similar cost.',
  'k-means':     'Iteratively refines K centroids in OKLCH space until they stop moving. Often finds the lowest-error partition of the four, at the cost of being iterative rather than a single pass.'
};
