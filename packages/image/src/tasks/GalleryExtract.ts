import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import {
  clusterDeltaEMerge,
  clusterMedianCut,
  clusterMedianCutWeighted,
  getOrCreateMetadata,
} from '@studnicky/iridis';
import type { GalleryAlgorithmType } from '../types/augmentation.ts';

/**
 * `gallery:extract`
 *
 * Reduces `state.colors` to K representative colours via one of three
 * clustering primitives, selected by `metadata.gallery.algorithm`:
 *
 *   - `'median-cut'` (default) — when at least one input record carries
 *     `hints.weight`, dispatches to `clusterMedianCutWeighted` so pixel
 *     density survives the reduction. Otherwise falls back to the
 *     stateless `clusterMedianCut` for backward compatibility with
 *     non-image inputs (raw hex palettes, RGB triples).
 *   - `'delta-e'` — agglomerative deltaE2000 merger. Pair with
 *     `gallery:histogram` upstream so the merger operates over ≤ a few
 *     hundred weighted bins rather than tens of thousands of pixels.
 *
 * Configuration (via `state.metadata.gallery`):
 *   k         — number of dominant colors to extract (default: 5)
 *   algorithm — `'median-cut'` (default) | `'delta-e'`
 *
 * Writes:
 *   state.metadata.gallery.dominantColors — the K representative colors
 *   state.colors                          — replaced with the K-color set
 */
/* True when ANY input carries a declared `hints.weight`. The presence
   of the hint key is the signal — not its magnitude — so a histogram
   where every bin happens to hold exactly one pixel still dispatches
   to the weighted reducer. The previous predicate excluded `weight === 1`
   and silently fell back to `clusterMedianCut`, losing the weight
   bookkeeping the upstream histogram had set up. */
function hasAnyWeight(colors: readonly ColorRecordInterface[]): boolean {
  for (const c of colors) {
    if (typeof c.hints?.weight === 'number' && c.hints.weight > 0) return true;
  }
  return false;
}

/**
 * Maximum number of records fed into the deltaE-merge reducer. The
 * agglomerative merger is O(N² log N), so feeding it a raw photo
 * histogram (thousands of non-empty bins) hangs the main thread. We
 * pre-trim by descending weight: the merger still sees every visually
 * important cluster (heaviest first), and the long tail of one-off
 * pixels falls off — which is the same trade-off median-cut already
 * makes implicitly when its bucket-selection heuristic refuses to
 * split low-weight buckets.
 */
const DELTA_E_INPUT_CAP_DEFAULT = 128;

function trimByWeightDescending(colors: readonly ColorRecordInterface[], cap: number): readonly ColorRecordInterface[] {
  if (colors.length <= cap) return colors;
  const sorted = [...colors].sort((a, b) => (b.hints?.weight ?? 1) - (a.hints?.weight ?? 1));
  return sorted.slice(0, cap);
}

export class GalleryExtract implements TaskInterface {
  readonly 'name' = 'gallery:extract';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'gallery:extract',
    'reads':       ['colors', 'metadata.gallery.k', 'metadata.gallery.algorithm'],
    'writes':      ['colors', 'metadata.gallery.dominantColors'],
    'description': 'Reduce input records to K dominant colors via median-cut (weighted) or deltaE-merge clustering',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const galleryMeta = getOrCreateMetadata(state, 'gallery');
    const k = galleryMeta['k'] ?? 5;
    const algorithm: GalleryAlgorithmType = galleryMeta['algorithm'] ?? 'median-cut';

    ctx.logger.debug('GalleryExtract', 'run', 'extracting dominant colors', {
      'inputCount': state.colors.length,
      'k':          k,
      'algorithm':  algorithm,
    });

    if (state.colors.length === 0) {
      ctx.logger.warn('GalleryExtract', 'run', 'state.colors is empty — nothing to extract');
      return;
    }

    const clamp = Math.min(k, state.colors.length);

    let dominant: ColorRecordInterface[];
    if (algorithm === 'delta-e') {
      const cap = Math.max(8, Math.min(512, Math.floor(galleryMeta['deltaECap'] ?? DELTA_E_INPUT_CAP_DEFAULT)));
      const trimmed = trimByWeightDescending(state.colors, cap);
      if (trimmed.length < state.colors.length) {
        ctx.logger.debug('GalleryExtract', 'run', 'trimmed delta-E input by weight', {
          'before': state.colors.length,
          'after':  trimmed.length,
          'cap':    cap,
        });
      }
      dominant = clusterDeltaEMerge.apply(trimmed, clamp);
    } else if (hasAnyWeight(state.colors)) {
      dominant = clusterMedianCutWeighted.apply(state.colors, clamp);
    } else {
      dominant = clusterMedianCut.apply(state.colors, clamp);
    }

    galleryMeta['dominantColors'] = dominant;

    state.colors.splice(0, state.colors.length, ...dominant);

    ctx.logger.info('GalleryExtract', 'run', 'extraction complete', {
      'dominantCount': dominant.length,
      'algorithm':     algorithm,
    });
  }
}

export const galleryExtract = new GalleryExtract();
