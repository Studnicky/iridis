import type {
  ColorRecordInterfaceTypeEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import { JsonValue } from '@studnicky/types/node';

import { ClusterDispatcher } from './ClusterDispatcher.ts';

/**
 * `gallery:extract`
 *
 * Reduces `state.colors` to K representative colours via one of four
 * clustering primitives, selected by `metadata.gallery.algorithm`:
 *
 *   - `'median-cut'` (default): when at least one input record carries
 *     `hints.weight`, dispatches to `clusterMedianCutWeighted` so pixel
 *     density survives the reduction. Otherwise falls back to the
 *     stateless `clusterMedianCut` for backward compatibility with
 *     non-image inputs (raw hex palettes, RGB triples). One-shot, box
 *     splits at the median — fast, but a median split can bisect a small,
 *     visually distinct cluster.
 *   - `'delta-e'`: agglomerative deltaE2000 merger. Pair with
 *     `gallery:histogram` upstream so the merger operates over ≤ a few
 *     hundred weighted bins rather than tens of thousands of pixels.
 *     Tends to keep visually-distinct minority colors that a box-splitting
 *     algorithm might merge away.
 *   - `'wu-quantize'`: recursive box splitting like median-cut, but each
 *     split lands at the point that minimizes combined within-side
 *     variance (Wu 1992's criterion) instead of at the median — one-shot
 *     like median-cut, but the split point is chosen to minimize total
 *     clustering error rather than just bisect the data.
 *   - `'k-means'`: iterative weighted Lloyd's-algorithm refinement in OKLCH
 *     space (k-means++ seeded, deterministic). Tends to find a lower-total-
 *     error partition than any one-shot splitter, at the cost of being
 *     iterative rather than a single pass.
 *
 * Configuration (via `state.metadata['gallery']`):
 *   k:         number of dominant colors to extract (default: 5)
 *   algorithm: `'median-cut'` (default) | `'delta-e'` | `'wu-quantize'` | `'k-means'`
 *
 * Writes:
 *   state.metadata['gallery:dominantColors']: the K representative colors
 *   state.colors:                             replaced with the K-color set
 */
class TrimLogger {
  private readonly context: PipelineContextInterface;

  constructor(context: PipelineContextInterface) {
    this.context = context;
  }

  log(
    before: number,
    after: number,
    cap: number
  ): void {
    this.context.logger.debug(
      LogBody.create({
        'component': 'GalleryExtract',
        'context': { 'after': after, 'before': before, 'cap': cap },
        'message': 'trimmed delta-E input by weight',
        'operation': 'run',
        'status': LOG_STATUS.PARTIAL
      })
    );
  }
}

class GalleryExtract implements TaskInterface {
  readonly 'name' = 'gallery:extract';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Reduce input records to K dominant colors via median-cut (weighted) or deltaE-merge clustering',
    'name':        'gallery:extract',
    'reads':       ['colors', 'metadata.gallery'],
    'writes':      ['colors', 'metadata.gallery:dominantColors']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const galleryConfig = state.metadata.gallery as
      | { 'algorithm'?: string; 'deltaECap'?: number; 'k'?: number; }
      | undefined;
    const k = galleryConfig?.k ?? 5;
    const algorithm = galleryConfig?.algorithm ?? 'median-cut';

    context.logger.debug(
      LogBody.create({
        'component': 'GalleryExtract',
        'context': {
          'algorithm':  algorithm,
          'inputCount': state.colors.length,
          'k':          k
        },
        'message': 'extracting dominant colors',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );

    if (state.colors.length === 0) {
      context.logger.warn(
        LogBody.create({
          'component': 'GalleryExtract',
          'context': {},
          'message': 'state.colors is empty; nothing to extract',
          'operation': 'run',
          'status': LOG_STATUS.INVALID
        })
      );
      return;
    }

    const deltaEOptions = {
      'deltaECap': galleryConfig?.deltaECap,
      'onTrim':    new TrimLogger(context)
    };
    let dominant: ColorRecordInterfaceTypeEntity.Type[];
    if (algorithm === 'delta-e') {
      dominant = ClusterDispatcher.deltaE(state.colors, k, deltaEOptions);
    } else if (algorithm === 'k-means') {
      dominant = ClusterDispatcher.kMeans(state.colors, k);
    } else if (algorithm === 'wu-quantize') {
      dominant = ClusterDispatcher.wuQuantize(state.colors, k);
    } else {
      dominant = ClusterDispatcher.medianCut(state.colors, k);
    }

    state.metadata['gallery:dominantColors'] = JsonValue.from(dominant);

    state.colors.splice(0, state.colors.length, ...dominant);

    context.logger.info(
      LogBody.create({
        'component': 'GalleryExtract',
        'context': {
          'algorithm':     algorithm,
          'dominantCount': dominant.length
        },
        'message': 'extraction complete',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const galleryExtract = new GalleryExtract();
