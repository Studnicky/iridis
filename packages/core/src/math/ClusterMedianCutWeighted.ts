import type { ColorRecordInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

interface BucketInterface {
  colors: ColorRecordInterface[];
  totalWeight: number;
}

function recordWeight(record: ColorRecordInterface): number {
  const w = record.hints?.weight;
  return typeof w === 'number' && w > 0 ? w : 1;
}

function bucketCentroid(bucket: BucketInterface): ColorRecordInterface {
  const colors = bucket.colors;
  const n = colors.length;
  if (n === 0) {
    return colorRecordFactory.fromOklch(0.5, 0, 0);
  }
  let sumL = 0, sumA = 0, sumB = 0, sumAlpha = 0, sumW = 0;
  for (let i = 0; i < n; i++) {
    const col = colors[i];
    if (col === undefined) continue;
    const w = recordWeight(col);
    const hRad = (col.oklch.h * Math.PI) / 180;
    sumL     += col.oklch.l * w;
    sumA     += col.oklch.c * Math.cos(hRad) * w;
    sumB     += col.oklch.c * Math.sin(hRad) * w;
    sumAlpha += col.alpha   * w;
    sumW     += w;
  }
  if (sumW === 0) {
    return colorRecordFactory.fromOklch(0.5, 0, 0);
  }
  const L = sumL / sumW;
  const aMean = sumA / sumW;
  const bMean = sumB / sumW;
  const C = Math.sqrt(aMean * aMean + bMean * bMean);
  let H = (Math.atan2(bMean, aMean) * 180) / Math.PI;
  if (H < 0) H += 360;
  return colorRecordFactory.fromOklch(L, C, H, sumAlpha / sumW, 'oklch', { 'weight': sumW });
}

function rangeOf(colors: ColorRecordInterface[], channel: 'l' | 'c' | 'h'): number {
  if (colors.length === 0) return 0;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < colors.length; i++) {
    const v = colors[i]?.oklch[channel] ?? 0;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}

function splitBucket(bucket: BucketInterface): [BucketInterface, BucketInterface] {
  const colors = bucket.colors;
  const lRange = rangeOf(colors, 'l');
  const cRange = rangeOf(colors, 'c');
  const hRange = rangeOf(colors, 'h') / 360;

  let channel: 'l' | 'c' | 'h' = 'l';
  if (cRange > lRange && cRange > hRange) channel = 'c';
  else if (hRange > lRange) channel = 'h';

  const sorted = [...colors].sort((a, b) => a.oklch[channel] - b.oklch[channel]);

  const half = bucket.totalWeight / 2;
  let acc = 0;
  let splitIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    const col = sorted[i];
    if (col === undefined) continue;
    acc += recordWeight(col);
    if (acc >= half) {
      splitIdx = i + 1;
      break;
    }
  }
  if (splitIdx <= 0)              splitIdx = 1;
  if (splitIdx >= sorted.length)  splitIdx = sorted.length - 1;

  const left  = sorted.slice(0, splitIdx);
  const right = sorted.slice(splitIdx);
  let lw = 0;
  for (const col of left)  lw += recordWeight(col);
  let rw = 0;
  for (const col of right) rw += recordWeight(col);
  return [
    { 'colors': left,  'totalWeight': lw },
    { 'colors': right, 'totalWeight': rw },
  ];
}

/**
 * Weighted median-cut clustering. Generalises {@link import('./ClusterMedianCut.ts').ClusterMedianCut}
 * to respect per-record `hints.weight`. Bucket splits choose the channel
 * with the widest range and partition by CUMULATIVE WEIGHT (not count),
 * so a heavily-weighted color survives reduction even when surrounded
 * by many low-weight neighbours.
 *
 * Output records carry `hints.weight` set to the cluster's total
 * weight, so downstream tasks (spectrograph, role assignment) can
 * paint cluster importance proportional to the source's pixel density.
 *
 * Selecting the largest bucket to split:
 *   the bucket with the HIGHEST totalWeight is split next. This biases
 *   the reduction toward separating dense regions of color space
 *   rather than thinly-populated outliers.
 */
export class ClusterMedianCutWeighted {
  readonly 'name' = 'clusterMedianCutWeighted';

  apply(colors: readonly ColorRecordInterface[], k: number): ColorRecordInterface[] {
    if (colors.length === 0) return [];
    if (k < 1) {
      throw new Error('ClusterMedianCutWeighted.apply: k must be a positive number');
    }

    const targetK = Math.min(Math.floor(k), colors.length);
    let totalW = 0;
    for (const col of colors) totalW += recordWeight(col);
    let buckets: BucketInterface[] = [{ 'colors': [...colors], 'totalWeight': totalW }];

    while (buckets.length < targetK) {
      let bestScore = -1;
      let bestIdx = 0;
      for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        if (bucket === undefined || bucket.colors.length <= 1) continue;
        // Bucket-selection score: weight × widest_range.
        //
        // Selecting purely by weight makes a huge uniform region (page
        // whites, sky) hog every split, so smaller-but-distinct hues
        // never get their own cluster — the resulting palette ends up
        // as N shades of the same neutral. Selecting purely by range
        // (Heckbert's original) ignores pixel density and lets a tiny
        // outlier dominate.
        //
        // weight × range is the standard minimum-within-cluster-error
        // heuristic: it picks the bucket where refining the partition
        // reduces clustering error the most. Hue is normalised to
        // [0, 1] by dividing by 360 so the three channels compare
        // fairly.
        const lRange = rangeOf(bucket.colors, 'l');
        const cRange = rangeOf(bucket.colors, 'c');
        const hRange = rangeOf(bucket.colors, 'h') / 360;
        const widestRange = Math.max(lRange, cRange, hRange);
        const score = bucket.totalWeight * widestRange;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      const target = buckets[bestIdx];
      if (target === undefined || target.colors.length <= 1) break;

      const [left, right] = splitBucket(target);
      buckets = [
        ...buckets.slice(0, bestIdx),
        left,
        right,
        ...buckets.slice(bestIdx + 1),
      ];
    }

    return buckets.map(bucketCentroid);
  }
}

/** Singleton instance registered as the `clusterMedianCutWeighted` math primitive. */
export const clusterMedianCutWeighted = new ClusterMedianCutWeighted();
