import { ValidationError } from '@studnicky/errors';

import type { ClusterWeightedBucketEntity } from '../entities/ClusterWeightedBucketEntity.ts';
import type { ColorRecordInterfaceType } from '../types/index.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';

class RecordWeight {
  static of(record: ColorRecordInterfaceType): number {
    const w = record.hints?.weight;
    return typeof w === 'number' && w > 0 ? w : 1;
  }
}

class BucketCentroid {
  static of(bucket: ClusterWeightedBucketEntity.Type): ColorRecordInterfaceType {
    const colors = bucket.colors;
    const n = colors.length;
    if (n === 0) {
      return colorRecordFactory.fromOklch(0.5, 0, 0);
    }
    let sumA = 0; let sumAlpha = 0; let sumB = 0; let sumL = 0; let sumW = 0;
    for (let i = 0; i < n; i++) {
      const col = colors[i];
      if (col === undefined) {continue;}
      const w = RecordWeight.of(col);
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
    if (H < 0) {H += 360;}
    return colorRecordFactory.fromOklch(L, C, H, { 'alpha': sumAlpha / sumW, 'hints': { 'intent': undefined, 'role': undefined, 'weight': sumW }, 'sourceFormat': 'oklch' });
  }
}

class ChannelRange {
  static of(colors: ColorRecordInterfaceType[], channel: 'l' | 'c'): number {
    if (colors.length === 0) {return 0;}
    let maximum = -Infinity; let minimum = Infinity;
    const colorsLength = colors.length;
    for (let i = 0; i < colorsLength; i++) {
      const v = colors[i]?.oklch[channel] ?? 0;
      if (v < minimum) {minimum = v;}
      if (v > maximum) {maximum = v;}
    }
    return maximum - minimum;
  }
}

/**
 * Circular hue stats for a bucket: the start of the widest contiguous arc
 * of hues (`gapStart`) and the angular width of that arc (`range`, degrees).
 * Computed via the largest-gap method so a bucket straddling 0/360 (e.g.
 * reds at 358/359/1/2) reports a small range instead of a spurious ~360.
 */
class CircularHueStats {
  static of(colors: ColorRecordInterfaceType[]): { 'gapStart': number; 'range': number } {
    const hues: number[] = [];
    const colorsLength = colors.length;
    for (let i = 0; i < colorsLength; i++) {
      const col = colors[i];
      if (col === undefined) {continue;}
      hues.push(((col.oklch.h % 360) + 360) % 360);
    }
    const n = hues.length;
    if (n <= 1) {
      const firstHue = hues[0] ?? 0;
      return { 'gapStart': firstHue, 'range': 0 };
    }
    hues.sort((a, b) => {return a - b;});
    let maximumGap = (hues[0]! + 360) - hues[n - 1]!;
    let gapStart = hues[0]!;
    for (let i = 1; i < n; i++) {
      const gap = hues[i]! - hues[i - 1]!;
      if (gap > maximumGap) {
        maximumGap = gap;
        gapStart = hues[i]!;
      }
    }
    return { 'gapStart': gapStart, 'range': 360 - maximumGap };
  }
}

/** Hue expressed as a non-negative offset (degrees) from `gapStart`, unwrapping the 0/360 seam. */
class UnwrappedHue {
  static of(h: number, gapStart: number): number {
    return (((h - gapStart) % 360) + 360) % 360;
  }
}

class Bucket {
  static split(bucket: ClusterWeightedBucketEntity.Type): [ClusterWeightedBucketEntity.Type, ClusterWeightedBucketEntity.Type] {
    const colors = bucket.colors;
    const lRange = ChannelRange.of(colors, 'l');
    const cRange = ChannelRange.of(colors, 'c');
    const hueStats = CircularHueStats.of(colors);
    const hRange = hueStats.range / 360;

    let channel: 'l' | 'c' | 'h' = 'l';
    if (cRange > lRange && cRange > hRange) {channel = 'c';}
    else if (hRange > lRange) {channel = 'h';}

    const sorted = channel === 'h'
      ? [...colors].sort((a, b) => {return UnwrappedHue.of(a.oklch.h, hueStats.gapStart) - UnwrappedHue.of(b.oklch.h, hueStats.gapStart);})
      : [...colors].sort((a, b) => {return a.oklch[channel] - b.oklch[channel];});

    const half = bucket.totalWeight / 2;
    let acc = 0;
    let splitIndex = 0;
    const sortedLength = sorted.length;
    for (let i = 0; i < sortedLength; i++) {
      const col = sorted[i];
      if (col === undefined) {continue;}
      acc += RecordWeight.of(col);
      if (acc >= half) {
        splitIndex = i + 1;
        break;
      }
    }
    if (splitIndex <= 0)              {splitIndex = 1;}
    if (splitIndex >= sorted.length)  {splitIndex = sorted.length - 1;}

    const left  = sorted.slice(0, splitIndex);
    const right = sorted.slice(splitIndex);
    let lw = 0;
    for (const col of left)  {lw += RecordWeight.of(col);}
    let rw = 0;
    for (const col of right) {rw += RecordWeight.of(col);}
    return [
      { 'colors': left,  'totalWeight': lw },
      { 'colors': right, 'totalWeight': rw }
    ];
  }
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
class ClusterMedianCutWeighted {
  readonly 'name' = 'clusterMedianCutWeighted';

  apply(colors: readonly ColorRecordInterfaceType[], k: number): ColorRecordInterfaceType[] {
    if (colors.length === 0) {return [];}
    if (k < 1) {
      throw ValidationError.create({
        'message': 'ClusterMedianCutWeighted.apply: k must be a positive number',
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
    for (const col of colors) {totalW += RecordWeight.of(col);}
    let buckets: ClusterWeightedBucketEntity.Type[] = [{ 'colors': [...colors], 'totalWeight': totalW }];

    while (buckets.length < targetK) {
      let bestScore = -1;
      let bestIndex = 0;
      const bucketsLength = buckets.length;
      for (let i = 0; i < bucketsLength; i++) {
        const bucket = buckets[i];
        if (bucket === undefined || bucket.colors.length <= 1) {continue;}
        // Bucket-selection score: weight × widest_range.
        //
        // Selecting purely by weight makes a huge uniform region (page
        // whites, sky) hog every split, so smaller-but-distinct hues
        // never get their own cluster; the resulting palette ends up
        // as N shades of the same neutral. Selecting purely by range
        // (Heckbert's original) ignores pixel density and lets a tiny
        // outlier dominate.
        //
        // weight × range is the standard minimum-within-cluster-error
        // heuristic: it picks the bucket where refining the partition
        // reduces clustering error the most. Hue is normalised to
        // [0, 1] by dividing by 360 so the three channels compare
        // fairly.
        const lRange = ChannelRange.of(bucket.colors, 'l');
        const cRange = ChannelRange.of(bucket.colors, 'c');
        const hRange = CircularHueStats.of(bucket.colors).range / 360;
        const widestRange = Math.max(lRange, cRange, hRange);
        const score = bucket.totalWeight * widestRange;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
      const target = buckets[bestIndex];
      if (target === undefined || target.colors.length <= 1) {break;}

      const [left, right] = Bucket.split(target);
      buckets = [
        ...buckets.slice(0, bestIndex),
        left,
        right,
        ...buckets.slice(bestIndex + 1)
      ];
    }

    return buckets.map((bucket) => {const result = BucketCentroid.of(bucket); return result;});
  }
}

/** Singleton instance registered as the `clusterMedianCutWeighted` math primitive. */
export const clusterMedianCutWeighted = new ClusterMedianCutWeighted();
