import type { ColorRecordEntity } from '@studnicky/iridis';

import type { GalleryAlgorithmTypeEntity } from '../entities/GalleryAlgorithmTypeEntity.ts';

/** Resolved clustering operation used after metadata admission. */
export interface ClusterStrategyInterface {
  apply(colors: readonly ColorRecordEntity.Type[], k: number, deltaECap: number | undefined): ColorRecordEntity.Type[];
  serializeAlgorithm(): GalleryAlgorithmTypeEntity.Type;
}
