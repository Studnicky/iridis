import type { GalleryAlgorithmType } from '@studnicky/iridis-image/types';

/** USelect options for the "Clustering algorithm" field — shared by every card that lets a user pick an image-extraction algorithm. Not `readonly` — Nuxt UI's `USelect` `:items` prop expects a mutable array type. */
export const ALGORITHM_ITEMS: { 'label': string; 'value': GalleryAlgorithmType }[] = [
  { 'label': 'ΔE (delta-e)', 'value': 'delta-e' },
  { 'label': 'Median cut', 'value': 'median-cut' },
  { 'label': 'Wu quantize', 'value': 'wu-quantize' },
  { 'label': 'K-means', 'value': 'k-means' }
];
