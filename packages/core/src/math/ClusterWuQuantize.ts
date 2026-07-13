import { ValidationError } from '@studnicky/errors';

import type { ColorRecordInterfaceType } from '../types/index.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';

type BucketInterface = {
  'colors': ColorRecordInterfaceType[];
  'totalWeight': number;
};

function recordWeight(record: ColorRecordInterfaceType): number {
  const w = record.hints?.weight;
  return typeof w === 'number' && w > 0 ? w : 1;
}

function bucketCentroid(bucket: BucketInterface): ColorRecordInterfaceType {
  const colors = bucket.colors;
  const n = colors.length;
  if (n === 0) {return colorRecordFactory.fromOklch(0.5, 0, 0);}
  let sumA = 0; let sumAlpha = 0; let sumB = 0; let sumL = 0; let sumW = 0;
  for (const col of colors) {
    const w = recordWeight(col);
    const hRad = (col.oklch.h * Math.PI) / 180;
    sumL     += col.oklch.l * w;
    sumA     += col.oklch.c * Math.cos(hRad) * w;
    sumB     += col.oklch.c * Math.sin(hRad) * w;
    sumAlpha += col.alpha   * w;
    sumW     += w;
  }
  if (sumW === 0) {return colorRecordFactory.fromOklch(0.5, 0, 0);}
  const L = sumL / sumW;
  const aMean = sumA / sumW;
  const bMean = sumB / sumW;
  const C = Math.sqrt(aMean * aMean + bMean * bMean);
  let H = (Math.atan2(bMean, aMean) * 180) / Math.PI;
  if (H < 0) {H += 360;}
  return colorRecordFactory.fromOklch(L, C, H, { 'alpha': sumAlpha / sumW, 'hints': { 'weight': sumW }, 'sourceFormat': 'oklch' });
}

function rangeOf(colors: ColorRecordInterfaceType[], channel: 'l' | 'c' | 'h'): number {
  if (colors.length === 0) {return 0;}
  let max = -Infinity; let min = Infinity;
  for (const c of colors) {
    const v = c.oklch[channel];
    if (v < min) {min = v;}
    if (v > max) {max = v;}
  }
  return max - min;
}

/**
 * Weighted sum-of-squared-error for a run of sorted, weighted 1-D values —
 * the quantity Wu's algorithm minimizes when choosing where to cut a box.
 * O(n) per candidate split via running sums rather than O(n²) recomputation.
 */
function splitAtMinVariance(sorted: ColorRecordInterfaceType[], channel: 'l' | 'c' | 'h'): number {
  const n = sorted.length;
  const values = sorted.map((c) => {return c.oklch[channel];});
  const weights = sorted.map(recordWeight);

  // Prefix sums so left/right weighted mean+variance are O(1) per candidate.
  const prefixW: number[] = [0]; const prefixV: number[] = [0]; const prefixV2: number[] = [0];
  for (let i = 0; i < n; i++) {
    const w = weights[i]!; const v = values[i]!;
    prefixW.push(prefixW[i]! + w);
    prefixV.push(prefixV[i]! + v * w);
    prefixV2.push(prefixV2[i]! + v * v * w);
  }
  const totalW = prefixW[n]!;

  function weightedVariance(fromInclusive: number, toExclusive: number): number {
    const w = prefixW[toExclusive]! - prefixW[fromInclusive]!;
    if (w <= 0) {return 0;}
    const sumV = prefixV[toExclusive]! - prefixV[fromInclusive]!;
    const sumV2 = prefixV2[toExclusive]! - prefixV2[fromInclusive]!;
    const mean = sumV / w;
    return sumV2 - 2 * mean * sumV + mean * mean * w;
  }

  let bestSplit = Math.max(1, Math.floor(n / 2));
  let bestError = Infinity;
  for (let split = 1; split < n; split++) {
    // Skip splits that would leave one side with zero weight — those aren't real cuts.
    if (prefixW[split]! <= 0 || (totalW - prefixW[split]!) <= 0) {continue;}
    const error = weightedVariance(0, split) + weightedVariance(split, n);
    if (error < bestError) { bestError = error; bestSplit = split; }
  }
  return bestSplit;
}

class Bucket {
  /** Splits along the channel with the widest range, at the point minimizing total within-side variance (Wu's criterion) rather than at the median (Heckbert's median-cut). */
  static split(bucket: BucketInterface): [BucketInterface, BucketInterface] {
    const colors = bucket.colors;
    const lRange = rangeOf(colors, 'l');
    const cRange = rangeOf(colors, 'c');
    const hRange = rangeOf(colors, 'h') / 360;

    let channel: 'l' | 'c' | 'h' = 'l';
    if (cRange > lRange && cRange > hRange) {channel = 'c';}
    else if (hRange > lRange) {channel = 'h';}

    const sorted = [...colors].sort((a, b) => {return a.oklch[channel] - b.oklch[channel];});
    const splitIdx = splitAtMinVariance(sorted, channel);

    const left = sorted.slice(0, splitIdx);
    const right = sorted.slice(splitIdx);
    let lw = 0; for (const c of left) {lw += recordWeight(c);}
    let rw = 0; for (const c of right) {rw += recordWeight(c);}
    return [
      { 'colors': left, 'totalWeight': lw },
      { 'colors': right, 'totalWeight': rw }
    ];
  }
}

/**
 * Wu's color quantization: recursive box splitting like median-cut, but each
 * split lands at the point that MINIMIZES the combined within-side weighted
 * variance (sum-of-squared-error) rather than at the median. This is the
 * same variance-minimization criterion Wu (1992) uses, adapted from RGB
 * histogram boxes to OKLCH color records so it composes with the rest of
 * this package's perceptually-uniform math. Deterministic, one-shot (no
 * iterative refinement like k-means), and tends to preserve small but
 * visually distinct clusters that a pure median split can bisect.
 */
class ClusterWuQuantize {
  readonly 'name' = 'clusterWuQuantize';

  apply(colors: readonly ColorRecordInterfaceType[], k: number): ColorRecordInterfaceType[] {
    if (colors.length === 0) {return [];}
    if (k < 1) {
      throw ValidationError.create({
        'message': 'ClusterWuQuantize.apply: k must be a positive number',
        'path':    'k',
        'violations': [{
          'details': { 'expected': 'k >= 1', 'received': k },
          'message': 'k is not a positive number',
          'path':    'k'
        }]
      });
    }

    const targetK = Math.min(Math.floor(k), colors.length);
    let totalW = 0;
    for (const c of colors) {totalW += recordWeight(c);}
    let buckets: BucketInterface[] = [{ 'colors': [...colors], 'totalWeight': totalW }];

    while (buckets.length < targetK) {
      let bestScore = -1;
      let bestIdx = 0;
      for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        if (bucket === undefined || bucket.colors.length <= 1) {continue;}
        const lRange = rangeOf(bucket.colors, 'l');
        const cRange = rangeOf(bucket.colors, 'c');
        const hRange = rangeOf(bucket.colors, 'h') / 360;
        const widestRange = Math.max(lRange, cRange, hRange);
        const score = bucket.totalWeight * widestRange;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }
      const target = buckets[bestIdx];
      if (target === undefined || target.colors.length <= 1) {break;}

      const [left, right] = Bucket.split(target);
      if (left.colors.length === 0 || right.colors.length === 0) {break;}
      buckets = [
        ...buckets.slice(0, bestIdx),
        left,
        right,
        ...buckets.slice(bestIdx + 1)
      ];
    }

    return buckets.map(bucketCentroid);
  }
}

/** Singleton instance registered as the `clusterWuQuantize` math primitive. */
export const clusterWuQuantize = new ClusterWuQuantize();
