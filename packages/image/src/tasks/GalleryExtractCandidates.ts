import type {
  ColorRecordInterfaceType,
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

/** Placeholder for a not-yet-computed candidate's `colors` — the default-config fallback below never has clustering results at config-build time; `run()` always overwrites it with the real `ClusterDispatcher.run` output before the config object is read again. */
const EMPTY_CANDIDATE_COLORS: ColorRecordInterfaceType[] = [];

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
 *   candidates: optional array of full `GalleryCandidateInterfaceType`
 *     configs (`colors` is ignored on the way in — `run()` always
 *     overwrites it with the freshly-computed clustering result). When
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
        'candidates'?:  readonly GalleryCandidateInterfaceType[];
        'deltaECap'?:   number;
        'k'?:           number;
      }
      | undefined;
    const sharedK = galleryConfig?.k ?? DEFAULT_K;
    const sharedDeltaECap = galleryConfig?.deltaECap;

    const configs: readonly GalleryCandidateInterfaceType[] = galleryConfig?.candidates
      ?? DEFAULT_CANDIDATE_ALGORITHMS.map((algorithm) => {
        return { 'algorithm': algorithm, 'colors': EMPTY_CANDIDATE_COLORS, 'k': sharedK, 'label': algorithm };
      });

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
      const colors = ClusterDispatcher.run(state.colors, config.algorithm, config.k, { 'deltaECap': sharedDeltaECap, 'onTrim': undefined });
      return {
        'algorithm': config.algorithm,
        'colors':    colors,
        'k':         config.k,
        'label':     config.label
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
