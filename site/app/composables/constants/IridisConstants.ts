import type { ColorRecordInterfaceTypeEntity } from '@studnicky/iridis';
import type { GalleryAlgorithmTypeEntity } from '@studnicky/iridis-image';

import { Tokens } from '../../theme/Tokens.ts';

export namespace IRIDIS_CONSTANTS {
  /** Mirrors CodeBlock.vue's role(...) lookups — the only other place a role is read by name. */
  export const CODE_BLOCK_ROLES = [
    'code-bg', 'syntax-comment', 'syntax-string', 'syntax-number', 'syntax-function',
    'syntax-attribute', 'syntax-keyword', 'syntax-punctuation', 'syntax-type'
  ];

  /** Every role name actually consumed somewhere on the page (Tokens.ts + CodeBlock.vue) — the ground truth for pinnable roles. */
  export const USED_ROLE_NAMES = new Set([...Tokens.candidateRoleNames(), ...CODE_BLOCK_ROLES]);

  /** The COMBINE stage pipeline over the already-per-image-reduced color list: histogram, candidates, dominant colors, harmonize. Role resolution belongs to the color pipeline that consumes the resulting seeds. */
  export const COMBINE_EXTRACTION_STAGES = ['intake:any', 'gallery:histogram', 'gallery:extractCandidates', 'gallery:extract', 'gallery:harmonize'];

  /** Stage 1 reduces one image's pixels to its dominant colors and per-algorithm candidates. */
  export const IMAGE_ENTRY_STAGES = ['intake:any', 'gallery:histogram', 'gallery:extractCandidates', 'gallery:extract'];

  /** Empty placeholder replaced by gallery:extractCandidates. */
  export const EMPTY_CANDIDATE_COLORS: ColorRecordInterfaceTypeEntity.Type[] = [];

  /** All supported clustering algorithms. */
  export const ALL_CANDIDATE_ALGORITHM_NAMES: readonly GalleryAlgorithmTypeEntity.Type[] = ['median-cut', 'wu-quantize', 'k-means', 'delta-e'];

  /** Total entries used to approximate a cumulative weighted histogram. */
  export const CUMULATIVE_HISTOGRAM_BUDGET = 1000;
}
