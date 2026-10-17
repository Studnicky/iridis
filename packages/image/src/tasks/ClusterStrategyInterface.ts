import type { ColorRecordInterfaceTypeEntity } from '@studnicky/iridis';

import type { GalleryAlgorithmTypeEntity } from '../entities/GalleryAlgorithmTypeEntity.ts';

/** Resolved clustering operation used after metadata admission. */
export interface ClusterStrategyInterface {
  apply(colors: readonly ColorRecordInterfaceTypeEntity.Type[], k: number, deltaECap: number | undefined): ColorRecordInterfaceTypeEntity.Type[];
  serializeAlgorithm(): GalleryAlgorithmTypeEntity.Type;
}
