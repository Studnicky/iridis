import { ValidationError } from '@studnicky/errors';

import type { ClusterBucketEntity } from '../entities/ClusterBucketEntity.ts';
import type { ColorRecordInterfaceType } from '../types/index.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';

class BucketMedian {
  static of(bucket: ClusterBucketEntity.Type): ColorRecordInterfaceType {
    const n = bucket.colors.length;
    if (n === 0) {
      return colorRecordFactory.fromOklch(0.5, 0, 0);
    }
    // Hue is circular: averaging degrees directly (sumH/n) sends a bucket of
    // reds straddling 0/360 to the opposite side of the wheel. Average in
    // Cartesian OKLab instead, same as bucketCentroid in ClusterMedianCutWeighted.
    let sumA = 0; let sumAlpha = 0; let sumB = 0; let sumL = 0;
    for (let i = 0; i < n; i++) {
      const col = bucket.colors[i];
      if (col === undefined) {continue;}
      const hRad = (col.oklch.h * Math.PI) / 180;
      sumL     += col.oklch.l;
      sumA     += col.oklch.c * Math.cos(hRad);
      sumB     += col.oklch.c * Math.sin(hRad);
      sumAlpha += col.alpha;
    }
    const L = sumL / n;
    const aMean = sumA / n;
    const bMean = sumB / n;
    const C = Math.sqrt(aMean * aMean + bMean * bMean);
    let H = (Math.atan2(bMean, aMean) * 180) / Math.PI;
    if (H < 0) {H += 360;}
    return colorRecordFactory.fromOklch(L, C, H, { 'alpha': sumAlpha / n });
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
  static split(bucket: ClusterBucketEntity.Type): [ClusterBucketEntity.Type, ClusterBucketEntity.Type] {
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
    const mid = Math.floor(sorted.length / 2);

    return [
      { 'colors': sorted.slice(0, mid) },
      { 'colors': sorted.slice(mid) }
    ];
  }
}

class ClusterMedianCut {
  readonly 'name' = 'clusterMedianCut';

  apply(colors: readonly ColorRecordInterfaceType[], k: number): ColorRecordInterfaceType[] {
    if (colors.length === 0) {return [];}
    if (k < 1) {
      throw ValidationError.create({
        'message': 'ClusterMedianCut.apply: k must be a positive number',
        'path':    'k',
        'violations': [{
          'details': { 'expected': 'k >= 1', 'received': k },
          'message': 'k is not a positive number',
          'path':    'k'
        }]
      });
    }

    const targetK = Math.min(Math.floor(k), colors.length);
    let buckets: ClusterBucketEntity.Type[] = [{ 'colors': [...colors] }];

    while (buckets.length < targetK) {
      let maximumSize = 0;
      let maximumIndex = 0;
      const bucketsLength = buckets.length;
      for (let i = 0; i < bucketsLength; i++) {
        const bucketLength = buckets[i]?.colors.length ?? 0;
        if (bucketLength > maximumSize) {
          maximumSize = bucketLength;
          maximumIndex = i;
        }
      }
      const target = buckets[maximumIndex];
      if (target === undefined || target.colors.length <= 1) {break;}

      const [left, right] = Bucket.split(target);
      buckets = [
        ...buckets.slice(0, maximumIndex),
        left,
        right,
        ...buckets.slice(maximumIndex + 1)
      ];
    }

    return buckets.map((bucket) => {const result = BucketMedian.of(bucket); return result;});
  }
}

/** Singleton instance registered as the `clusterMedianCut` math primitive. */
export const clusterMedianCut = new ClusterMedianCut();
