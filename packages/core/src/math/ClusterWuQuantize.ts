import { ValidationError } from '@studnicky/errors/node';

import type { ClusterWeightedBucketEntity } from '../entities/ClusterWeightedBucketEntity.ts';

import { ColorRecordInterfaceTypeEntity } from '../entities/ColorRecordInterfaceTypeEntity.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

class RecordWeight {
  static of(record: ColorRecordInterfaceTypeEntity.Type): number {
    const weight = record.hints?.weight;
    const result = typeof weight === 'number' && weight > 0 ? weight : 1;
    return result;
  }
}

class BucketCentroid {
  static of(bucket: ClusterWeightedBucketEntity.Type): ColorRecordInterfaceTypeEntity.Type {
    const colors = bucket.colors.map(ColorRecordInterfaceTypeEntity.intake);
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
      const color = colors[colorIndex]!;
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
  static chroma(colors: readonly ColorRecordInterfaceTypeEntity.Type[]): number {
    let maximum = -Infinity;
    let minimum = Infinity;
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const chroma = colors[colorIndex]!.oklch.c;
      if (chroma < minimum) {minimum = chroma;}
      if (chroma > maximum) {maximum = chroma;}
    }
    const result = maximum - minimum;
    return result;
  }

  static lightness(colors: readonly ColorRecordInterfaceTypeEntity.Type[]): number {
    let maximum = -Infinity;
    let minimum = Infinity;
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const lightness = colors[colorIndex]!.oklch.l;
      if (lightness < minimum) {minimum = lightness;}
      if (lightness > maximum) {maximum = lightness;}
    }
    const result = maximum - minimum;
    return result;
  }
}

class CircularHueStats {
  static compare(first: number, second: number): number {
    const result = first - second;
    return result;
  }

  static of(colors: readonly ColorRecordInterfaceTypeEntity.Type[]): { 'gapStart': number; 'range': number } {
    const hues = new Array<number>(colors.length);
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const hue = colors[colorIndex]!.oklch.h;
      hues[colorIndex] = ((hue % 360) + 360) % 360;
    }
    if (colorCount <= 1) {
      const result = { 'gapStart': hues[0] ?? 0, 'range': 0 };
      return result;
    }
    hues.sort(CircularHueStats.compare);
    let maximumGap = (hues[0]! + 360) - hues[colorCount - 1]!;
    let gapStart = hues[0]!;
    for (let hueIndex = 1; hueIndex < colorCount; hueIndex++) {
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

class UnwrappedHue {
  static of(hue: number, gapStart: number): number {
    const result = ((hue - gapStart) % 360 + 360) % 360;
    return result;
  }
}

class WeightedVariance {
  static of(prefixWeights: readonly number[], prefixValues: readonly number[], prefixSquares: readonly number[], fromInclusive: number, toExclusive: number): number {
    const weight = prefixWeights[toExclusive]! - prefixWeights[fromInclusive]!;
    if (weight <= 0) {
      const result = 0;
      return result;
    }
    const valueSum = prefixValues[toExclusive]! - prefixValues[fromInclusive]!;
    const squareSum = prefixSquares[toExclusive]! - prefixSquares[fromInclusive]!;
    const mean = valueSum / weight;
    const result = squareSum - 2 * mean * valueSum + mean * mean * weight;
    return result;
  }
}

class Bucket {
  static byChroma(colors: readonly ColorRecordInterfaceTypeEntity.Type[]): [ClusterWeightedBucketEntity.Type, ClusterWeightedBucketEntity.Type] {
    const sorted = Array.from(colors);
    sorted.sort(Bucket.compareChroma);
    const values = Bucket.chromas(sorted);
    const result = Bucket.fromVarianceSplit(sorted, values);
    return result;
  }

  static byHue(colors: readonly ColorRecordInterfaceTypeEntity.Type[], gapStart: number): [ClusterWeightedBucketEntity.Type, ClusterWeightedBucketEntity.Type] {
    const sorted = Array.from(colors);
    sorted.sort((first, second) => {
      const result = UnwrappedHue.of(first.oklch.h, gapStart) - UnwrappedHue.of(second.oklch.h, gapStart);
      return result;
    });
    const values = Bucket.unwrappedHues(sorted, gapStart);
    const result = Bucket.fromVarianceSplit(sorted, values);
    return result;
  }

  static byLightness(colors: readonly ColorRecordInterfaceTypeEntity.Type[]): [ClusterWeightedBucketEntity.Type, ClusterWeightedBucketEntity.Type] {
    const sorted = Array.from(colors);
    sorted.sort(Bucket.compareLightness);
    const values = Bucket.lightnesses(sorted);
    const result = Bucket.fromVarianceSplit(sorted, values);
    return result;
  }

  static chromas(colors: readonly ColorRecordInterfaceTypeEntity.Type[]): number[] {
    const result = new Array<number>(colors.length);
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      result[colorIndex] = colors[colorIndex]!.oklch.c;
    }
    return result;
  }

  static compareChroma(first: ColorRecordInterfaceTypeEntity.Type, second: ColorRecordInterfaceTypeEntity.Type): number {
    const result = first.oklch.c - second.oklch.c;
    return result;
  }

  static compareLightness(first: ColorRecordInterfaceTypeEntity.Type, second: ColorRecordInterfaceTypeEntity.Type): number {
    const result = first.oklch.l - second.oklch.l;
    return result;
  }

  static fromVarianceSplit(sorted: readonly ColorRecordInterfaceTypeEntity.Type[], values: readonly number[]): [ClusterWeightedBucketEntity.Type, ClusterWeightedBucketEntity.Type] {
    const splitIndex = Bucket.minimumVarianceSplit(values, sorted);
    const left = sorted.slice(0, splitIndex);
    const right = sorted.slice(splitIndex);
    const result: [ClusterWeightedBucketEntity.Type, ClusterWeightedBucketEntity.Type] = [
      { 'colors': left, 'totalWeight': Bucket.weight(left) },
      { 'colors': right, 'totalWeight': Bucket.weight(right) }
    ];
    return result;
  }

  static lightnesses(colors: readonly ColorRecordInterfaceTypeEntity.Type[]): number[] {
    const result = new Array<number>(colors.length);
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      result[colorIndex] = colors[colorIndex]!.oklch.l;
    }
    return result;
  }

  static minimumVarianceSplit(values: readonly number[], colors: readonly ColorRecordInterfaceTypeEntity.Type[]): number {
    const colorCount = colors.length;
    const prefixWeights: number[] = [0];
    const prefixValues: number[] = [0];
    const prefixSquares: number[] = [0];
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const weight = RecordWeight.of(colors[colorIndex]!);
      const value = values[colorIndex]!;
      prefixWeights.push(prefixWeights[colorIndex]! + weight);
      prefixValues.push(prefixValues[colorIndex]! + value * weight);
      prefixSquares.push(prefixSquares[colorIndex]! + value * value * weight);
    }
    const totalWeight = prefixWeights[colorCount]!;
    let bestSplit = Math.max(1, Math.floor(colorCount / 2));
    let bestError = Infinity;
    for (let splitIndex = 1; splitIndex < colorCount; splitIndex++) {
      const leftWeight = prefixWeights[splitIndex]!;
      const rightWeight = totalWeight - leftWeight;
      if (leftWeight <= 0 || rightWeight <= 0) {continue;}
      const error = WeightedVariance.of(prefixWeights, prefixValues, prefixSquares, 0, splitIndex) + WeightedVariance.of(prefixWeights, prefixValues, prefixSquares, splitIndex, colorCount);
      if (error < bestError) {
        bestError = error;
        bestSplit = splitIndex;
      }
    }
    return bestSplit;
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
        result[resultIndex] = buckets[bucketIndex]!;
        resultIndex += 1;
      }
    }
    return result;
  }

  static split(bucket: ClusterWeightedBucketEntity.Type): [ClusterWeightedBucketEntity.Type, ClusterWeightedBucketEntity.Type] {
    const colors = bucket.colors.map(ColorRecordInterfaceTypeEntity.intake);
    const lightnessRange = ChannelRange.lightness(colors);
    const chromaRange = ChannelRange.chroma(colors);
    const hueStats = CircularHueStats.of(colors);
    const hueRange = hueStats.range / 360;
    if (chromaRange > lightnessRange && chromaRange > hueRange) {
      const result = Bucket.byChroma(colors);
      return result;
    }
    if (hueRange > lightnessRange) {
      const result = Bucket.byHue(colors, hueStats.gapStart);
      return result;
    }
    const result = Bucket.byLightness(colors);
    return result;
  }

  static unwrappedHues(colors: readonly ColorRecordInterfaceTypeEntity.Type[], gapStart: number): number[] {
    const result = new Array<number>(colors.length);
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      result[colorIndex] = UnwrappedHue.of(colors[colorIndex]!.oklch.h, gapStart);
    }
    return result;
  }

  static weight(colors: readonly ColorRecordInterfaceTypeEntity.Type[]): number {
    let result = 0;
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      result += RecordWeight.of(colors[colorIndex]!);
    }
    return result;
  }
}

class BucketSelection {
  static next(buckets: readonly ClusterWeightedBucketEntity.Type[]): number {
    let bestIndex = 0;
    let bestScore = -1;
    const bucketCount = buckets.length;
    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
      const bucket = buckets[bucketIndex];
      if (bucket === undefined || bucket.colors.length <= 1) {continue;}
      const colors = bucket.colors.map(ColorRecordInterfaceTypeEntity.intake);
      const hueRange = CircularHueStats.of(colors).range / 360;
      const widestRange = Math.max(ChannelRange.lightness(colors), ChannelRange.chroma(colors), hueRange);
      const score = bucket.totalWeight * widestRange;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = bucketIndex;
      }
    }
    return bestIndex;
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

  apply(colors: readonly ColorRecordInterfaceTypeEntity.Type[], k: number): ColorRecordInterfaceTypeEntity.Type[] {
    if (colors.length === 0) {
      const result: ColorRecordInterfaceTypeEntity.Type[] = [];
      return result;
    }
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

    const targetCount = Math.min(Math.floor(k), colors.length);
    const initialColors = Array.from(colors);
    let buckets: ClusterWeightedBucketEntity.Type[] = [{ 'colors': initialColors, 'totalWeight': Bucket.weight(initialColors) }];
    while (buckets.length < targetCount) {
      const selectedIndex = BucketSelection.next(buckets);
      const selected = buckets[selectedIndex];
      if (selected === undefined || selected.colors.length <= 1) {break;}
      const [left, right] = Bucket.split(selected);
      if (left.colors.length === 0 || right.colors.length === 0) {break;}
      buckets = Bucket.replace(buckets, selectedIndex, left, right);
    }

    const result = new Array<ColorRecordInterfaceTypeEntity.Type>(buckets.length);
    const bucketCount = buckets.length;
    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
      result[bucketIndex] = BucketCentroid.of(buckets[bucketIndex]!);
    }
    return result;
  }
}

/** Singleton instance registered as the `clusterWuQuantize` math primitive. */
export const clusterWuQuantize = new ClusterWuQuantize();
