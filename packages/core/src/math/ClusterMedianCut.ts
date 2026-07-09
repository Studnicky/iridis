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
  let sumAlpha = 0; let sumC = 0; let sumH = 0; let sumL = 0;
  for (let i = 0; i < n; i++) {
    const col = bucket.colors[i];
    if (col === undefined) {continue;}
    sumL += col.oklch.l;
    sumC += col.oklch.c;
    sumH += col.oklch.h;
    sumAlpha += col.alpha;
  }
  return colorRecordFactory.fromOklch(sumL / n, sumC / n, sumH / n, { 'alpha': sumAlpha / n });
}

function rangeOf(colors: ColorRecordInterfaceType[], channel: 'l' | 'c' | 'h'): number {
  if (colors.length === 0) {return 0;}
  let max = -Infinity; let min = Infinity;
  for (let i = 0; i < colors.length; i++) {
    const v = colors[i]?.oklch[channel] ?? 0;
    if (v < min) {min = v;}
    if (v > max) {max = v;}
  }
  return max - min;
}

class Bucket {
  static split(bucket: BucketInterface): [BucketInterface, BucketInterface] {
    const colors = bucket.colors;
    const lRange = rangeOf(colors, 'l');
    const cRange = rangeOf(colors, 'c');
    const hRange = rangeOf(colors, 'h') / 360;

    let channel: 'l' | 'c' | 'h' = 'l';
    if (cRange > lRange && cRange > hRange) {channel = 'c';}
    else if (hRange > lRange) {channel = 'h';}

    const sorted = [...colors].sort((a, b) => {return a.oklch[channel] - b.oklch[channel];});
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
