import { ValidationError } from '@studnicky/errors';

import type { ColorRecordInterfaceType } from '../types/index.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';

type BucketInterface = {
  'colors': ColorRecordInterfaceType[];
};

function bucketMedian(bucket: BucketInterface): ColorRecordInterfaceType {
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

function rangeOf(colors: ColorRecordInterfaceType[], channel: 'l' | 'c'): number {
  if (colors.length === 0) {return 0;}
  let max = -Infinity; let min = Infinity;
  for (let i = 0; i < colors.length; i++) {
    const v = colors[i]?.oklch[channel] ?? 0;
    if (v < min) {min = v;}
    if (v > max) {max = v;}
  }
  return max - min;
}

/**
 * Circular hue stats for a bucket: the start of the widest contiguous arc
 * of hues (`gapStart`) and the angular width of that arc (`range`, degrees).
 * Computed via the largest-gap method so a bucket straddling 0/360 (e.g.
 * reds at 358/359/1/2) reports a small range instead of a spurious ~360.
 */
function circularHueStats(colors: ColorRecordInterfaceType[]): { 'gapStart': number; 'range': number } {
  const hues: number[] = [];
  for (let i = 0; i < colors.length; i++) {
    const col = colors[i];
    if (col === undefined) {continue;}
    hues.push(((col.oklch.h % 360) + 360) % 360);
  }
  const n = hues.length;
  if (n <= 1) {return { 'gapStart': hues[0] ?? 0, 'range': 0 };}
  hues.sort((a, b) => {return a - b;});
  let maxGap = (hues[0]! + 360) - hues[n - 1]!;
  let gapStart = hues[0]!;
  for (let i = 1; i < n; i++) {
    const gap = hues[i]! - hues[i - 1]!;
    if (gap > maxGap) {
      maxGap = gap;
      gapStart = hues[i]!;
    }
  }
  return { 'gapStart': gapStart, 'range': 360 - maxGap };
}

/** Hue expressed as a non-negative offset (degrees) from `gapStart`, unwrapping the 0/360 seam. */
function unwrappedHue(h: number, gapStart: number): number {
  return (((h - gapStart) % 360) + 360) % 360;
}

class Bucket {
  static split(bucket: BucketInterface): [BucketInterface, BucketInterface] {
    const colors = bucket.colors;
    const lRange = rangeOf(colors, 'l');
    const cRange = rangeOf(colors, 'c');
    const hueStats = circularHueStats(colors);
    const hRange = hueStats.range / 360;

    let channel: 'l' | 'c' | 'h' = 'l';
    if (cRange > lRange && cRange > hRange) {channel = 'c';}
    else if (hRange > lRange) {channel = 'h';}

    const sorted = channel === 'h'
      ? [...colors].sort((a, b) => {return unwrappedHue(a.oklch.h, hueStats.gapStart) - unwrappedHue(b.oklch.h, hueStats.gapStart);})
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
    let buckets: BucketInterface[] = [{ 'colors': [...colors] }];

    while (buckets.length < targetK) {
      let maxSize = 0;
      let maxIdx = 0;
      for (let i = 0; i < buckets.length; i++) {
        const len = buckets[i]?.colors.length ?? 0;
        if (len > maxSize) {
          maxSize = len;
          maxIdx = i;
        }
      }
      const target = buckets[maxIdx];
      if (target === undefined || target.colors.length <= 1) {break;}

      const [left, right] = Bucket.split(target);
      buckets = [
        ...buckets.slice(0, maxIdx),
        left,
        right,
        ...buckets.slice(maxIdx + 1)
      ];
    }

    return buckets.map(bucketMedian);
  }
}

/** Singleton instance registered as the `clusterMedianCut` math primitive. */
export const clusterMedianCut = new ClusterMedianCut();
