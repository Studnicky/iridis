import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { GalleryAlgorithmType } from '../types/augmentation.ts';

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
class GalleryExtract implements TaskInterface {
  readonly 'name' = 'gallery:extract';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Reduce input records to K dominant colors via median-cut (weighted) or deltaE-merge clustering',
    'name':        'gallery:extract',
    'reads':       ['colors', 'metadata.gallery'],
    'writes':      ['colors', 'metadata.gallery:dominantColors']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const galleryConfig = state.metadata.gallery as
      | { 'algorithm'?: GalleryAlgorithmType; 'deltaECap'?: number; 'k'?: number; }
      | undefined;
    const k = galleryConfig?.k ?? 5;
    const algorithm: GalleryAlgorithmType = galleryConfig?.algorithm ?? 'median-cut';

    ctx.logger.debug(
      LogBody.create()
        .component('GalleryExtract')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('extracting dominant colors')
        .context({
          'algorithm':  algorithm,
          'inputCount': state.colors.length,
          'k':          k
        })
        .build()
    );

    if (state.colors.length === 0) {
      ctx.logger.warn(
        LogBody.create()
          .component('GalleryExtract')
          .operation('run')
          .status(LOG_STATUS.INVALID)
          .message('state.colors is empty; nothing to extract')
          .context({})
          .build()
      );
      return;
    }

    const dominant: ColorRecordInterfaceType[] = ClusterDispatcher.run(
      state.colors,
      algorithm,
      k,
      {
        'deltaECap': galleryConfig?.deltaECap,
        'onTrim':    (before, after, cap) => {
          ctx.logger.debug(
            LogBody.create()
              .component('GalleryExtract')
              .operation('run')
              .status(LOG_STATUS.PARTIAL)
              .message('trimmed delta-E input by weight')
              .context({
                'after':  after,
                'before': before,
                'cap':    cap
              })
              .build()
          );
        }
      }
    );

    state.metadata['gallery:dominantColors'] = dominant;

    state.colors.splice(0, state.colors.length, ...dominant);

    ctx.logger.info(
      LogBody.create()
        .component('GalleryExtract')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('extraction complete')
        .context({
          'algorithm':     algorithm,
          'dominantCount': dominant.length
        })
        .build()
    );
  }
}

export const galleryExtract = new GalleryExtract();
