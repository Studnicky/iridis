import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  GalleryAlgorithmType,
  GalleryCandidateInterfaceType
} from '../types/augmentation.ts';

import { ClusterDispatcher } from './ClusterDispatcher.ts';

type GalleryCandidateConfigInterfaceType = {
  'algorithm'?: GalleryAlgorithmType;
  'k'?:         number;
  'label'?:     string;
};

/**
 * `gallery:extractCandidates`
 *
 * Non-destructive sibling of `gallery:extract`: runs the same per-algorithm
 * clustering dispatch across several configurations against the SAME
 * `state.colors` input, and collects each as a labeled candidate palette
 * rather than replacing `state.colors`. Gives the caller "a few optimized
 * palettes" to choose from instead of one deterministic reduction.
 *
 * Configuration (via `state.metadata['gallery']`):
 *   candidates: optional array of `{ algorithm?, k?, label? }`. When
 *     absent, defaults to three candidates over the SAME input, one per
 *     algorithm (`median-cut`, `k-means`, `delta-e`), sharing
 *     `metadata.gallery.k` / `metadata.gallery.deltaECap` as defaults so a
 *     caller who already configured those for `gallery:extract` gets
 *     consistent candidates without extra config.
 *
 * Writes:
 *   state.metadata['gallery:candidates']: array of
 *     `{ algorithm, k, label, colors }`
 */
const DEFAULT_K = 5;
const DEFAULT_CANDIDATE_ALGORITHMS: readonly GalleryAlgorithmType[] = ['median-cut', 'k-means', 'delta-e'];

class GalleryExtractCandidates implements TaskInterface {
  readonly 'name' = 'gallery:extractCandidates';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Non-destructively run clustering across several configs, collecting each as a labeled candidate palette',
    'name':        'gallery:extractCandidates',
    'reads':       ['colors', 'metadata.gallery'],
    'writes':      ['metadata.gallery:candidates']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const galleryConfig = state.metadata.gallery as
      | {
        'candidates'?:  readonly GalleryCandidateConfigInterfaceType[];
        'deltaECap'?:   number;
        'k'?:           number;
      }
      | undefined;
    const sharedK = galleryConfig?.k ?? DEFAULT_K;
    const sharedDeltaECap = galleryConfig?.deltaECap;

    const configs: readonly GalleryCandidateConfigInterfaceType[] = galleryConfig?.candidates
      ?? DEFAULT_CANDIDATE_ALGORITHMS.map((algorithm) => {return { 'algorithm': algorithm };});

    ctx.logger.debug(
      LogBody.create()
        .component('GalleryExtractCandidates')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('extracting candidate palettes')
        .context({
          'candidateCount': configs.length,
          'inputCount':     state.colors.length
        })
        .build()
    );

    if (state.colors.length === 0) {
      ctx.logger.warn(
        LogBody.create()
          .component('GalleryExtractCandidates')
          .operation('run')
          .status(LOG_STATUS.INVALID)
          .message('state.colors is empty; nothing to extract')
          .context({})
          .build()
      );
      return;
    }

    const candidates: GalleryCandidateInterfaceType[] = configs.map((config) => {
      const algorithm: GalleryAlgorithmType = config.algorithm ?? 'median-cut';
      const k = config.k ?? sharedK;
      const colors = ClusterDispatcher.run(state.colors, algorithm, k, sharedDeltaECap);
      return {
        'algorithm': algorithm,
        'colors':    colors,
        'k':         k,
        'label':     config.label ?? algorithm
      };
    });

    state.metadata['gallery:candidates'] = candidates;

    ctx.logger.info(
      LogBody.create()
        .component('GalleryExtractCandidates')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('candidate extraction complete')
        .context({
          'algorithms': candidates.map((c) => {const result = c.algorithm;
            return result;}),
          'count':      candidates.length
        })
        .build()
    );
  }
}

export const galleryExtractCandidates = new GalleryExtractCandidates();
