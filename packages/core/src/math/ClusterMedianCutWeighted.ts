import { ValidationError } from '@studnicky/errors/node';

import type { ClusterWeightedBucketEntity } from '../entities/ClusterWeightedBucketEntity.ts';

import { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

class RecordWeight {
  static of(record: ColorRecordEntity.Type): number {
    const weight = record.hints?.weight;
    const result = typeof weight === 'number' && weight > 0 ? weight : 1;
    return result;
  }
}

class BucketCentroid {
  static of(bucket: ClusterWeightedBucketEntity.Type): ColorRecordEntity.Type {
    const colors = bucket.colors.map(ColorRecordEntity.intake);
    const colorCount = colors.length;
    if (colorCount === 0) {
      const result = colorRecordFactory.fromOklch(0.5, 0, 0);
      return result;
    }
    let firstAxisSum = 0;
    let alphaSum = 0;
    let secondAxisSum = 0;
    let lightnessSum = 0;
    let weightSum = 0;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const color = colors[colorIndex];
      if (color === undefined) {continue;}
      const weight = RecordWeight.of(color);
      const hueRadians = (color.oklch.h * Math.PI) / 180;
      lightnessSum += color.oklch.l * weight;
      firstAxisSum += color.oklch.c * Math.cos(hueRadians) * weight;
      secondAxisSum += color.oklch.c * Math.sin(hueRadians) * weight;
      alphaSum += color.alpha * weight;
      weightSum += weight;
    }
    if (weightSum === 0) {
      const result = colorRecordFactory.fromOklch(0.5, 0, 0);
      return result;
    }
    const lightness = lightnessSum / weightSum;
    const firstAxisMean = firstAxisSum / weightSum;
    const secondAxisMean = secondAxisSum / weightSum;
    const chroma = Math.sqrt(firstAxisMean * firstAxisMean + secondAxisMean * secondAxisMean);
    let hue = (Math.atan2(secondAxisMean, firstAxisMean) * 180) / Math.PI;
    if (hue < 0) {hue += 360;}
    const result = colorRecordFactory.fromOklch(lightness, chroma, hue, { 'alpha': alphaSum / weightSum, 'hints': { 'weight': weightSum }, 'sourceFormat': 'oklch' });
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

  static weight(colors: readonly ColorRecordEntity.Type[]): number {
    let result = 0;
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const color = colors[colorIndex];
      if (color !== undefined) {result += RecordWeight.of(color);}
    }
    return result;
  }

  static widestRange(colors: readonly ColorRecordEntity.Type[]): number {
    const lightnessRange = ChannelRange.lightness(colors);
    const chromaRange = ChannelRange.chroma(colors);
    const hueRange = CircularHueStats.of(colors).range / 360;
    const result = Math.max(lightnessRange, chromaRange, hueRange);
    return result;
  }

  static splitSorted(sorted: readonly ColorRecordEntity.Type[], totalWeight: number): [ClusterWeightedBucketEntity.Type, ClusterWeightedBucketEntity.Type] {
    const threshold = totalWeight / 2;
    let cumulativeWeight = 0;
    let splitIndex = 0;
    const colorCount = sorted.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const color = sorted[colorIndex];
      if (color === undefined) {continue;}
      cumulativeWeight += RecordWeight.of(color);
      if (cumulativeWeight >= threshold) {
        splitIndex = colorIndex + 1;
        break;
      }
    }
    if (splitIndex <= 0) {splitIndex = 1;}
    if (splitIndex >= colorCount) {splitIndex = colorCount - 1;}

    const left = sorted.slice(0, splitIndex);
    const right = sorted.slice(splitIndex);
    const result: [ClusterWeightedBucketEntity.Type, ClusterWeightedBucketEntity.Type] = [
      { 'colors': left, 'totalWeight': Bucket.weight(left) },
      { 'colors': right, 'totalWeight': Bucket.weight(right) }
    ];
    return result;
  }

  static split(bucket: ClusterWeightedBucketEntity.Type): [ClusterWeightedBucketEntity.Type, ClusterWeightedBucketEntity.Type] {
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
      const result = Bucket.splitSorted(sorted, bucket.totalWeight);
      return result;
    }
    if (chromaRange > lightnessRange) {
      const sorted = [...colors].sort(Bucket.compareChroma);
      const result = Bucket.splitSorted(sorted, bucket.totalWeight);
      return result;
    }
    const sorted = [...colors].sort(Bucket.compareLightness);
    const result = Bucket.splitSorted(sorted, bucket.totalWeight);
    return result;
  }

  static replace(buckets: readonly ClusterWeightedBucketEntity.Type[], index: number, left: ClusterWeightedBucketEntity.Type, right: ClusterWeightedBucketEntity.Type): ClusterWeightedBucketEntity.Type[] {
    const result = new Array<ClusterWeightedBucketEntity.Type>(buckets.length + 1);
    let resultIndex = 0;
    const bucketCount = buckets.length;
    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
      if (bucketIndex === index) {
        result[resultIndex] = left;
        resultIndex += 1;
        result[resultIndex] = right;
        resultIndex += 1;
      } else {
        const bucket = buckets[bucketIndex];
        if (bucket === undefined) {continue;}
        result[resultIndex] = bucket;
        resultIndex += 1;
      }
    }
    return result;
  }

  static nextSplittableIndex(buckets: readonly ClusterWeightedBucketEntity.Type[]): number {
    let bestScore = -1;
    let bestIndex = 0;
    const bucketCount = buckets.length;
    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
      const bucket = buckets[bucketIndex];
      if (bucket === undefined || bucket.colors.length <= 1) {continue;}
      const colors = bucket.colors.map(ColorRecordEntity.intake);
      const score = bucket.totalWeight * Bucket.widestRange(colors);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = bucketIndex;
      }
    }
    return bestIndex;
  }

  static expand(initialBuckets: ClusterWeightedBucketEntity.Type[], targetCount: number): ClusterWeightedBucketEntity.Type[] {
    let buckets = initialBuckets;
    while (buckets.length < targetCount) {
      const targetIndex = Bucket.nextSplittableIndex(buckets);
      const target = buckets[targetIndex];
      if (target === undefined || target.colors.length <= 1) {break;}
      const [left, right] = Bucket.split(target);
      buckets = Bucket.replace(buckets, targetIndex, left, right);
    }
    return buckets;
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

  apply(colors: readonly ColorRecordEntity.Type[], k: number): ColorRecordEntity.Type[] {
    if (colors.length === 0) {
      const result: ColorRecordEntity.Type[] = [];
      return result;
    }
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

    const targetCount = Math.min(Math.floor(k), colors.length);
    const initialColors = Array.from(colors);
    const initialBuckets: ClusterWeightedBucketEntity.Type[] = [{ 'colors': initialColors, 'totalWeight': Bucket.weight(initialColors) }];
    const buckets = Bucket.expand(initialBuckets, targetCount);

    const result = new Array<ColorRecordEntity.Type>(buckets.length);
    const bucketCount = buckets.length;
    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
      const bucket = buckets[bucketIndex];
      if (bucket !== undefined) {result[bucketIndex] = BucketCentroid.of(bucket);}
    }
    return result;
  }
}

/** Singleton instance registered as the `clusterMedianCutWeighted` math primitive. */
export const clusterMedianCutWeighted = new ClusterMedianCutWeighted();
