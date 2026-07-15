import type { ColorRecordInterfaceType } from '@studnicky/iridis';

import {
  clusterDeltaEMerge,
  clusterKMeans,
  clusterMedianCut,
  clusterMedianCutWeighted,
  clusterWuQuantize
} from '@studnicky/iridis';

import type { GalleryAlgorithmType } from '../types/augmentation.ts';

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

/**
 * `ClusterDispatcher`
 *
 * Shared per-algorithm clustering dispatch used by both `gallery:extract`
 * (destructive, single-result) and `gallery:extractCandidates`
 * (non-destructive, multi-result). Selects one of four clustering
 * primitives by `algorithm` and applies weight-aware trimming ahead of
 * the deltaE-merge path.
 */
class ClusterDispatcher {
  /**
   * True when ANY input carries a declared `hints.weight`. The presence of
   * the hint key is the signal (not its magnitude), so a histogram where
   * every bin happens to hold exactly one pixel still dispatches to the
   * weighted reducer, preserving the upstream histogram's weight bookkeeping
   * instead of silently falling back to the unweighted `clusterMedianCut`.
   */
  private static hasAnyWeight(colors: readonly ColorRecordInterfaceType[]): boolean {
    for (const c of colors) {
      if (typeof c.hints?.weight === 'number' && c.hints.weight > 0) {return true;}
    }
    return false;
  }

  private static trimRank(color: ColorRecordInterfaceType): number {
    const weight = color.hints?.weight ?? 1;
    return Math.sqrt(weight);
  }

  private static trimByWeightDescending(colors: readonly ColorRecordInterfaceType[], cap: number): readonly ColorRecordInterfaceType[] {
    if (colors.length <= cap) {return colors;}
    const chromatic: ColorRecordInterfaceType[] = [];
    const neutral: ColorRecordInterfaceType[] = [];
    for (const c of colors) {
      if (c.oklch.c >= CHROMA_EPSILON) {chromatic.push(c);} else {neutral.push(c);}
    }
    chromatic.sort((a, b) => {return ClusterDispatcher.trimRank(b) - ClusterDispatcher.trimRank(a);});
    neutral.sort((a, b) => {return ClusterDispatcher.trimRank(b) - ClusterDispatcher.trimRank(a);});
    return [...chromatic, ...neutral].slice(0, cap);
  }

  /**
   * Reduce `colors` to `k` representative colors via the named `algorithm`.
   * Never mutates `colors`. Returns the same trim-log details the caller
   * needs for observability via the optional `opts.onTrim` callback.
   */
  static run(
    colors: readonly ColorRecordInterfaceType[],
    algorithm: GalleryAlgorithmType,
    k: number,
    opts?: { 'deltaECap': number | undefined; 'onTrim': ((before: number, after: number, cap: number) => void) | undefined }
  ): ColorRecordInterfaceType[] {
    const clamp = Math.min(k, colors.length);

    if (algorithm === 'delta-e') {
      const cap = Math.max(8, Math.min(512, Math.floor(opts?.deltaECap ?? DELTA_E_INPUT_CAP_DEFAULT)));
      const trimmed = ClusterDispatcher.trimByWeightDescending(colors, cap);
      if (trimmed.length < colors.length && opts?.onTrim !== undefined) {
        opts.onTrim(colors.length, trimmed.length, cap);
      }
      return clusterDeltaEMerge.apply(trimmed, clamp);
    }
    if (algorithm === 'k-means') {
      return clusterKMeans.apply(colors, clamp);
    }
    if (algorithm === 'wu-quantize') {
      return clusterWuQuantize.apply(colors, clamp);
    }
    if (ClusterDispatcher.hasAnyWeight(colors)) {
      return clusterMedianCutWeighted.apply(colors, clamp);
    }
    return clusterMedianCut.apply(colors, clamp);
  }
}

export { ClusterDispatcher };
