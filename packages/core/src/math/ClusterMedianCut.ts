import { ValidationError } from '@studnicky/errors/node';

import type { ClusterBucketEntity } from '../entities/ClusterBucketEntity.ts';

import { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

class BucketMedian {
  static of(bucket: ClusterBucketEntity.Type): ColorRecordEntity.Type {
    const colors = bucket.colors.map(ColorRecordEntity.intake);
    const colorCount = colors.length;
    if (colorCount === 0) {
      const result = colorRecordFactory.fromOklch(0.5, 0, 0);
      return result;
    }
    // Hue is circular: averaging degrees directly (sumH/n) sends a bucket of
    // reds straddling 0/360 to the opposite side of the wheel. Average in
    // Cartesian OKLab instead, same as bucketCentroid in ClusterMedianCutWeighted.
    let firstAxisSum = 0;
    let alphaSum = 0;
    let secondAxisSum = 0;
    let lightnessSum = 0;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const color = colors[colorIndex];
      if (color === undefined) {continue;}
      const hueRadians = (color.oklch.h * Math.PI) / 180;
      lightnessSum += color.oklch.l;
      firstAxisSum += color.oklch.c * Math.cos(hueRadians);
      secondAxisSum += color.oklch.c * Math.sin(hueRadians);
      alphaSum += color.alpha;
    }
    const lightness = lightnessSum / colorCount;
    const firstAxisMean = firstAxisSum / colorCount;
    const secondAxisMean = secondAxisSum / colorCount;
    const chroma = Math.sqrt(firstAxisMean * firstAxisMean + secondAxisMean * secondAxisMean);
    let hue = (Math.atan2(secondAxisMean, firstAxisMean) * 180) / Math.PI;
    if (hue < 0) {hue += 360;}
    const result = colorRecordFactory.fromOklch(lightness, chroma, hue, { 'alpha': alphaSum / colorCount });
    return result;
  }
}

class ChannelRange {
  static lightness(colors: readonly ColorRecordEntity.Type[]): number {
    let maximum = -Infinity;
    let minimum = Infinity;
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const lightness = colors[colorIndex]?.oklch.l ?? 0;
      if (lightness < minimum) {minimum = lightness;}
      if (lightness > maximum) {maximum = lightness;}
    }
    const result = colorCount === 0 ? 0 : maximum - minimum;
    return result;
  }

  static chroma(colors: readonly ColorRecordEntity.Type[]): number {
    let maximum = -Infinity;
    let minimum = Infinity;
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const chroma = colors[colorIndex]?.oklch.c ?? 0;
      if (chroma < minimum) {minimum = chroma;}
      if (chroma > maximum) {maximum = chroma;}
    }
    const result = colorCount === 0 ? 0 : maximum - minimum;
    return result;
  }
}

/**
 * Circular hue stats for a bucket: the start of the widest contiguous arc
 * of hues (`gapStart`) and the angular width of that arc (`range`, degrees).
 * Computed via the largest-gap method so a bucket straddling 0/360 (e.g.
 * reds at 358/359/1/2) reports a small range instead of a spurious ~360.
 */
class CircularHueStats {
  static compare(first: number, second: number): number {
    const result = first - second;
    return result;
  }

  static of(colors: readonly ColorRecordEntity.Type[]): { 'gapStart': number; 'range': number } {
    const hues: number[] = [];
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const color = colors[colorIndex];
      if (color === undefined) {continue;}
      hues.push(((color.oklch.h % 360) + 360) % 360);
    }
    const hueCount = hues.length;
    if (hueCount <= 1) {
      const firstHue = hues[0] ?? 0;
      const result = { 'gapStart': firstHue, 'range': 0 };
      return result;
    }
    hues.sort(CircularHueStats.compare);
    let maximumGap = (hues[0]! + 360) - hues[hueCount - 1]!;
    let gapStart = hues[0]!;
    for (let hueIndex = 1; hueIndex < hueCount; hueIndex++) {
      const gap = hues[hueIndex]! - hues[hueIndex - 1]!;
      if (gap > maximumGap) {
        maximumGap = gap;
        gapStart = hues[hueIndex]!;
      }
    }
    const result = { 'gapStart': gapStart, 'range': 360 - maximumGap };
    return result;
  }
}

/** Hue expressed as a non-negative offset (degrees) from `gapStart`, unwrapping the 0/360 seam. */
class UnwrappedHue {
  static of(hue: number, gapStart: number): number {
    const result = ((hue - gapStart) % 360 + 360) % 360;
    return result;
  }
}

class Bucket {
  static compareHue(first: ColorRecordEntity.Type, second: ColorRecordEntity.Type, gapStart: number): number {
    const result = UnwrappedHue.of(first.oklch.h, gapStart) - UnwrappedHue.of(second.oklch.h, gapStart);
    return result;
  }

  static compareChroma(first: ColorRecordEntity.Type, second: ColorRecordEntity.Type): number {
    const result = first.oklch.c - second.oklch.c;
    return result;
  }

  static compareLightness(first: ColorRecordEntity.Type, second: ColorRecordEntity.Type): number {
    const result = first.oklch.l - second.oklch.l;
    return result;
  }

  static replace(buckets: readonly ClusterBucketEntity.Type[], index: number, left: ClusterBucketEntity.Type, right: ClusterBucketEntity.Type): ClusterBucketEntity.Type[] {
    const result = new Array<ClusterBucketEntity.Type>(buckets.length + 1);
    let resultIndex = 0;
    const bucketCount = buckets.length;
    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
      if (bucketIndex === index) {
        result[resultIndex] = left;
        resultIndex += 1;
        result[resultIndex] = right;
        resultIndex += 1;
      } else {
        result[resultIndex] = buckets[bucketIndex]!;
        resultIndex += 1;
      }
    }
    return result;
  }

  static split(bucket: ClusterBucketEntity.Type): [ClusterBucketEntity.Type, ClusterBucketEntity.Type] {
    const colors = bucket.colors.map(ColorRecordEntity.intake);
    const lightnessRange = ChannelRange.lightness(colors);
    const chromaRange = ChannelRange.chroma(colors);
    const hueStats = CircularHueStats.of(colors);
    const normalizedHueRange = hueStats.range / 360;

    if (normalizedHueRange > lightnessRange && normalizedHueRange > chromaRange) {
      const sorted = [...colors].sort((first, second) => {
        const result = Bucket.compareHue(first, second, hueStats.gapStart);
        return result;
      });
      const midpoint = Math.floor(sorted.length / 2);
      const result: [ClusterBucketEntity.Type, ClusterBucketEntity.Type] = [
        { 'colors': sorted.slice(0, midpoint) },
        { 'colors': sorted.slice(midpoint) }
      ];
      return result;
    }
    if (chromaRange > lightnessRange) {
      const sorted = [...colors].sort(Bucket.compareChroma);
      const midpoint = Math.floor(sorted.length / 2);
      const result: [ClusterBucketEntity.Type, ClusterBucketEntity.Type] = [
        { 'colors': sorted.slice(0, midpoint) },
        { 'colors': sorted.slice(midpoint) }
      ];
      return result;
    }
    const sorted = [...colors].sort(Bucket.compareLightness);
    const midpoint = Math.floor(sorted.length / 2);
    const result: [ClusterBucketEntity.Type, ClusterBucketEntity.Type] = [
      { 'colors': sorted.slice(0, midpoint) },
      { 'colors': sorted.slice(midpoint) }
    ];
    return result;
  }
}

class ClusterMedianCut {
  readonly 'name' = 'clusterMedianCut';

  apply(colors: readonly ColorRecordEntity.Type[], k: number): ColorRecordEntity.Type[] {
    if (colors.length === 0) {
      const result: ColorRecordEntity.Type[] = [];
      return result;
    }
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

    const targetCount = Math.min(Math.floor(k), colors.length);
    const initialColors = Array.from(colors);
    const buckets: ClusterBucketEntity.Type[] = [{ 'colors': initialColors }];

    while (buckets.length < targetCount) {
      let largestBucketSize = 0;
      let largestBucketIndex = 0;
      const bucketCount = buckets.length;
      for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
        const bucketSize = buckets[bucketIndex]?.colors.length ?? 0;
        if (bucketSize > largestBucketSize) {
          largestBucketSize = bucketSize;
          largestBucketIndex = bucketIndex;
        }
      }
      const target = buckets[largestBucketIndex];
      if (target === undefined || target.colors.length <= 1) {break;}

      const [left, right] = Bucket.split(target);
      const nextBuckets = Bucket.replace(buckets, largestBucketIndex, left, right);
      buckets.length = 0;
      const nextBucketCount = nextBuckets.length;
      for (let nextBucketIndex = 0; nextBucketIndex < nextBucketCount; nextBucketIndex++) {
        buckets.push(nextBuckets[nextBucketIndex]!);
      }
    }

    const result = new Array<ColorRecordEntity.Type>(buckets.length);
    const bucketCount = buckets.length;
    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
      result[bucketIndex] = BucketMedian.of(buckets[bucketIndex]!);
    }
    return result;
  }
}

/** Singleton instance registered as the `clusterMedianCut` math primitive. */
export const clusterMedianCut = new ClusterMedianCut();
