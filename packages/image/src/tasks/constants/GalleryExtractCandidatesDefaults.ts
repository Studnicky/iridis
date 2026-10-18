import type { ColorRecordInterfaceTypeEntity } from '@studnicky/iridis';

import { GalleryAlgorithmTypeEntity } from '../../entities/GalleryAlgorithmTypeEntity.ts';

/** Placeholder for a not-yet-computed candidate's `colors` — the default-config fallback below never has clustering results at config-build time; `run()` always overwrites it with the real `ClusterDispatcher.run` output before the config object is read again. */
const EMPTY_CANDIDATE_COLORS: ColorRecordInterfaceTypeEntity.Type[] = [];

const DEFAULT_K = 5;

const DEFAULT_CANDIDATE_ALGORITHMS: readonly GalleryAlgorithmTypeEntity.Type[] = [
  GalleryAlgorithmTypeEntity.intake('median-cut'),
  GalleryAlgorithmTypeEntity.intake('k-means'),
  GalleryAlgorithmTypeEntity.intake('delta-e')
];

export const GALLERY_EXTRACT_CANDIDATES_DEFAULTS = {
  'DEFAULT_CANDIDATE_ALGORITHMS': DEFAULT_CANDIDATE_ALGORITHMS,
  'DEFAULT_K':                    DEFAULT_K,
  'EMPTY_CANDIDATE_COLORS':       EMPTY_CANDIDATE_COLORS
} as const;
