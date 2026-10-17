import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';
import type { JSONSchema7Type } from 'json-schema';

import { TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import { JsonValue } from '@studnicky/types/node';

import type { ClusterStrategyInterface } from './ClusterStrategyInterface.ts';

import { GalleryCandidateOutputEntity } from '../entities/GalleryCandidateOutputEntity.ts';
import { ClusterDispatcher } from './ClusterDispatcher.ts';
import { GALLERY_EXTRACT_CANDIDATES_DEFAULTS } from './constants/GalleryExtractCandidatesDefaults.ts';

/** Internal executable configuration; never crosses the JSON metadata boundary. */
abstract class GalleryCandidateExtractionConfiguration {
  abstract 'k': number;
  abstract 'label': string;
  abstract 'strategy': ClusterStrategyInterface;
}

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
 *   candidates: optional array of serializable `algorithm`, `k`, and `label`
 *     configs. Each config is admitted into an internal strategy only while
 *     clustering; emitted candidates never contain that executable strategy.
 *     When absent, defaults to three candidates over the SAME input, one per
 *     algorithm (`median-cut`, `k-means`, `delta-e`), sharing
 *     `metadata.gallery.k` / `metadata.gallery.deltaECap` as defaults so a
 *     caller who already configured those for `gallery:extract` gets
 *     consistent candidates without extra config.
 *
 * Writes:
 *   state.metadata['gallery:candidates']: array of
 *     `{ algorithm, k, label, colors }`
 */
class GalleryExtractCandidates implements TaskInterface {
  readonly 'name' = 'gallery:extractCandidates';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Non-destructively run clustering across several configs, collecting each as a labeled candidate palette',
    'name':        'gallery:extractCandidates',
    'reads':       ['colors', 'metadata.gallery'],
    'writes':      ['metadata.gallery:candidates']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const galleryConfig = state.metadata.gallery as
      | {
        'candidates'?:  readonly { 'algorithm'?: JSONSchema7Type; 'k'?: number; 'label'?: string; }[];
        'deltaECap'?:   number;
        'k'?:           number;
      }
      | undefined;
    const sharedK = galleryConfig?.k ?? GALLERY_EXTRACT_CANDIDATES_DEFAULTS.DEFAULT_K;
    const sharedDeltaECap = galleryConfig?.deltaECap;

    const sourceConfigs = galleryConfig?.candidates;
    const configs: readonly GalleryCandidateExtractionConfiguration[] = sourceConfigs === undefined
      ? GALLERY_EXTRACT_CANDIDATES_DEFAULTS.DEFAULT_CANDIDATE_ALGORITHMS.map((algorithm) => {
        const strategy = ClusterDispatcher.resolve(algorithm);
        return { 'k': sharedK, 'label': strategy.serializeAlgorithm(), 'strategy': strategy };
      })
      : sourceConfigs.flatMap((config) => {
        if (typeof config.label !== 'string' || typeof config.k !== 'number' || config.algorithm === undefined) {return [];}
        const strategy = ClusterDispatcher.resolve(config.algorithm);
        return [{ 'k': config.k, 'label': config.label, 'strategy': strategy }];
      });

    context.logger.debug(
      LogBody.create({
        'component': 'GalleryExtractCandidates',
        'context': {
          'candidateCount': configs.length,
          'inputCount':     state.colors.length
        },
        'message': 'extracting candidate palettes',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );

    if (state.colors.length === 0) {
      context.logger.warn(
        LogBody.create({
          'component': 'GalleryExtractCandidates',
          'context': {},
          'message': 'state.colors is empty; nothing to extract',
          'operation': 'run',
          'status': LOG_STATUS.INVALID
        })
      );
      return;
    }

    const candidates = configs.map((config) => {
      const result = GalleryCandidateOutputEntity.create({
        'algorithm': config.strategy.serializeAlgorithm(),
        'colors':    config.strategy.apply(state.colors, config.k, sharedDeltaECap),
        'k':         config.k,
        'label':     config.label
      });
      return result;
    });

    state.metadata['gallery:candidates'] = JsonValue.from(candidates);

    context.logger.info(
      LogBody.create({
        'component': 'GalleryExtractCandidates',
        'context': {
          'algorithms': configs.map((config) => {const result = config.strategy.serializeAlgorithm();
            return result;}),
          'count':      candidates.length
        },
        'message': 'candidate extraction complete',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const galleryExtractCandidates = new GalleryExtractCandidates();
