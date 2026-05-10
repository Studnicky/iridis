import type { ColorRecordInterface, MathPrimitiveInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['oklch'] === 'object' && c['oklch'] !== null;
}

interface BucketInterface {
  colors: ColorRecordInterface[];
}

function bucketMedian(bucket: BucketInterface): ColorRecordInterface {
  const n = bucket.colors.length;
  if (n === 0) {
    return colorRecordFactory.fromOklch(0.5, 0, 0);
  }
  let sumL = 0, sumC = 0, sumH = 0, sumAlpha = 0;
  for (let i = 0; i < n; i++) {
    const col = bucket.colors[i];
    if (col === undefined) continue;
    sumL += col.oklch.l;
    sumC += col.oklch.c;
    sumH += col.oklch.h;
    sumAlpha += col.alpha;
  }
  return colorRecordFactory.fromOklch(sumL / n, sumC / n, sumH / n, sumAlpha / n);
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
  const mid = Math.floor(sorted.length / 2);

  return [
    { colors: sorted.slice(0, mid) },
    { colors: sorted.slice(mid) },
  ];
}

/**
 * Math primitive that reduces an arbitrary palette of colors to `k`
 * representative colors via Heckbert's median-cut algorithm operating
 * in OKLCH. Splits along whichever axis (L, C, or H) currently spans
 * the widest range; each bucket's median is the channel-wise mean of
 * its members. Used by `clamp:count` to cap downstream work when an
 * intake stage produces hundreds of pixels (e.g. image extraction).
 */
export class ClusterMedianCut implements MathPrimitiveInterface {
  readonly 'name' = 'clusterMedianCut';

  apply(...args: readonly unknown[]): ColorRecordInterface[] {
    const [colors, k] = args;
    if (!Array.isArray(colors) || !colors.every(isColorRecord)) {
      throw new Error('ClusterMedianCut.apply: expected (colors: ColorRecord[], k: number)');
    }
    if (typeof k !== 'number' || k < 1) {
      throw new Error('ClusterMedianCut.apply: k must be a positive number');
    }

    if (colors.length === 0) return [];

    const targetK = Math.min(Math.floor(k), colors.length);
    let buckets: BucketInterface[] = [{ colors: [...colors] }];

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
      if (target === undefined || target.colors.length <= 1) break;

      const [left, right] = splitBucket(target);
      buckets = [
        ...buckets.slice(0, maxIdx),
        left,
        right,
        ...buckets.slice(maxIdx + 1),
      ];
    }

    return buckets.map(bucketMedian);
  }
}

/** Singleton instance registered as the `clusterMedianCut` math primitive. */
export const clusterMedianCut = new ClusterMedianCut();
