import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import {
  clusterDeltaEMerge,
  clusterKMeans,
  clusterMedianCut,
  clusterMedianCutWeighted,
  clusterWuQuantize
} from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { GalleryAlgorithmType } from '../types/augmentation.ts';

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
/* True when ANY input carries a declared `hints.weight`. The presence of
   the hint key is the signal (not its magnitude), so a histogram where
   every bin happens to hold exactly one pixel still dispatches to the
   weighted reducer, preserving the upstream histogram's weight bookkeeping
   instead of silently falling back to the unweighted `clusterMedianCut`. */
function hasAnyWeight(colors: readonly ColorRecordInterfaceType[]): boolean {
  for (const c of colors) {
    if (typeof c.hints?.weight === 'number' && c.hints.weight > 0) {return true;}
  }
  return false;
}

/**
 * Maximum number of records fed into the deltaE-merge reducer. The
 * agglomerative merger is O(N² log N), so feeding it a raw photo
 * histogram (thousands of non-empty bins) hangs the main thread. We
 * pre-trim by descending weight: the merger still sees every visually
 * important cluster (heaviest first), and the long tail of one-off
 * pixels falls off, which is the same trade-off median-cut already
 * makes implicitly when its bucket-selection heuristic refuses to
 * split low-weight buckets.
 *
 * The trim ranking is NOT raw pixel count. A single enormous flat
 * region (e.g. a solid-black background covering most of the frame)
 * would otherwise linearly out-vote many smaller, genuinely saturated
 * regions whose own weight is split across many slightly-different
 * quantised bins. Two adjustments make the ranking reflect visual
 * prominence instead of pixel-count dominance:
 *
 *   - weight is dampened via sqrt() before ranking, so a bin 100x
 *     heavier than another only ranks ~10x higher, not 100x.
 *   - near-achromatic bins (chroma below CHROMA_EPSILON — grays,
 *     near-black, near-white) are ranked in a separate, lower tier,
 *     since in a hue-extraction context they are far more often
 *     background/neutral than a deliberately chosen palette color.
 *     Monochrome/grayscale images still extract correctly: neutral
 *     bins fill remaining cap slots once no chromatic bins are left.
 */
const DELTA_E_INPUT_CAP_DEFAULT = 128;
const CHROMA_EPSILON = 0.05;

function trimRank(color: ColorRecordInterfaceType): number {
  const weight = color.hints?.weight ?? 1;
  return Math.sqrt(weight);
}

function trimByWeightDescending(colors: readonly ColorRecordInterfaceType[], cap: number): readonly ColorRecordInterfaceType[] {
  if (colors.length <= cap) {return colors;}
  const chromatic: ColorRecordInterfaceType[] = [];
  const neutral: ColorRecordInterfaceType[] = [];
  for (const c of colors) {
    if (c.oklch.c >= CHROMA_EPSILON) {chromatic.push(c);} else {neutral.push(c);}
  }
  chromatic.sort((a, b) => {return trimRank(b) - trimRank(a);});
  neutral.sort((a, b) => {return trimRank(b) - trimRank(a);});
  return [...chromatic, ...neutral].slice(0, cap);
}

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

    const clamp = Math.min(k, state.colors.length);

    let dominant: ColorRecordInterfaceType[];
    if (algorithm === 'delta-e') {
      const cap = Math.max(8, Math.min(512, Math.floor(galleryConfig?.deltaECap ?? DELTA_E_INPUT_CAP_DEFAULT)));
      const trimmed = trimByWeightDescending(state.colors, cap);
      if (trimmed.length < state.colors.length) {
        ctx.logger.debug(
          LogBody.create()
            .component('GalleryExtract')
            .operation('run')
            .status(LOG_STATUS.PARTIAL)
            .message('trimmed delta-E input by weight')
            .context({
              'after':  trimmed.length,
              'before': state.colors.length,
              'cap':    cap
            })
            .build()
        );
      }
      dominant = clusterDeltaEMerge.apply(trimmed, clamp);
    } else if (algorithm === 'k-means') {
      dominant = clusterKMeans.apply(state.colors, clamp);
    } else if (algorithm === 'wu-quantize') {
      dominant = clusterWuQuantize.apply(state.colors, clamp);
    } else if (hasAnyWeight(state.colors)) {
      dominant = clusterMedianCutWeighted.apply(state.colors, clamp);
    } else {
      dominant = clusterMedianCut.apply(state.colors, clamp);
    }

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
