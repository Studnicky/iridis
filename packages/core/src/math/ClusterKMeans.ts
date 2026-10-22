import { ValidationError } from '@studnicky/errors/node';

import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';
import type { LabInputEntity } from '../entities/LabInputEntity.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';

class RecordWeight {
  static of(record: ColorRecordEntity.Type): number {
    const weight = record.hints?.weight;
    const result = typeof weight === 'number' && weight > 0 ? weight : 1;
    return result;
  }
}

/** Cartesian (L, a, b) so hue wraparound never distorts distance/mean the way averaging raw hue degrees would. */
class Point {
  static to(record: ColorRecordEntity.Type): LabInputEntity.Type {
    const hueRadians = (record.oklch.h * Math.PI) / 180;
    const result = { 'a': record.oklch.c * Math.cos(hueRadians), 'b': record.oklch.c * Math.sin(hueRadians), 'l': record.oklch.l };
    return result;
  }
}

class SquaredDistance {
  static between(first: LabInputEntity.Type, second: LabInputEntity.Type): number {
    const lightnessDifference = first.l - second.l;
    const firstAxisDifference = first.a - second.a;
    const secondAxisDifference = first.b - second.b;
    const result = lightnessDifference * lightnessDifference + firstAxisDifference * firstAxisDifference + secondAxisDifference * secondAxisDifference;
    return result;
  }
}

class PointConversion {
  static toRecord(point: LabInputEntity.Type, alpha: number, weight: number): ColorRecordEntity.Type {
    const chroma = Math.sqrt(point.a * point.a + point.b * point.b);
    let hue = (Math.atan2(point.b, point.a) * 180) / Math.PI;
    if (hue < 0) {hue += 360;}
    const result = colorRecordFactory.fromOklch(point.l, chroma, hue, { 'alpha': alpha, 'hints': { 'weight': weight }, 'sourceFormat': 'oklch' });
    return result;
  }
}

class CentroidSeeding {
  static score(point: LabInputEntity.Type, weight: number, centroids: readonly LabInputEntity.Type[]): number {
    let minimumDistance = Infinity;
    const centroidCount = centroids.length;
    for (let centroidIndex = 0; centroidIndex < centroidCount; centroidIndex++) {
      const distance = SquaredDistance.between(point, centroids[centroidIndex]!);
      if (distance < minimumDistance) {minimumDistance = distance;}
    }
    const result = minimumDistance * weight;
    return result;
  }

  static firstAvailableIndex(points: readonly LabInputEntity.Type[], centroids: readonly LabInputEntity.Type[]): number {
    const pointCount = points.length;
    for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
      let selected = false;
      const centroidCount = centroids.length;
      for (let centroidIndex = 0; centroidIndex < centroidCount; centroidIndex++) {
        if (points[pointIndex] === centroids[centroidIndex]) {
          selected = true;
          break;
        }
      }
      if (!selected) {return pointIndex;}
    }
    return 0;
  }

  static weightedPlusPlus(points: readonly LabInputEntity.Type[], weights: readonly number[], count: number): LabInputEntity.Type[] {
    const centroids: LabInputEntity.Type[] = [];
    let greatestWeightIndex = 0;
    const pointCount = points.length;
    for (let pointIndex = 1; pointIndex < pointCount; pointIndex++) {
      if (weights[pointIndex]! > weights[greatestWeightIndex]!) {greatestWeightIndex = pointIndex;}
    }
    centroids.push(points[greatestWeightIndex]!);

    while (centroids.length < count) {
      const scores = new Array<number>(pointCount);
      let total = 0;
      for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
        const score = CentroidSeeding.score(points[pointIndex]!, weights[pointIndex]!, centroids);
        scores[pointIndex] = score;
        total += score;
      }
      if (total <= 0) {
        const availableIndex = CentroidSeeding.firstAvailableIndex(points, centroids);
        centroids.push(points[availableIndex]!);
        continue;
      }
      let remainingThreshold = total / 2;
      let chosenIndex = 0;
      for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
        remainingThreshold -= scores[pointIndex]!;
        if (remainingThreshold <= 0) {
          chosenIndex = pointIndex;
          break;
        }
      }
      centroids.push(points[chosenIndex]!);
    }
    return centroids;
  }
}

class ClusterSummary {
  static assign(points: readonly LabInputEntity.Type[], centroids: readonly LabInputEntity.Type[], assignments: number[]): boolean {
    let changed = false;
    const pointCount = points.length;
    for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
      let nearestCentroidIndex = 0;
      let nearestDistance = Infinity;
      const centroidCount = centroids.length;
      for (let centroidIndex = 0; centroidIndex < centroidCount; centroidIndex++) {
        const distance = SquaredDistance.between(points[pointIndex]!, centroids[centroidIndex]!);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestCentroidIndex = centroidIndex;
        }
      }
      if (assignments[pointIndex] !== nearestCentroidIndex) {
        assignments[pointIndex] = nearestCentroidIndex;
        changed = true;
      }
    }
    return changed;
  }

  static recalculate(points: readonly LabInputEntity.Type[], weights: readonly number[], assignments: readonly number[], centroids: readonly LabInputEntity.Type[]): LabInputEntity.Type[] {
    const sums = new Array<{ 'a': number; 'b': number; 'l': number; 'weight': number }>(centroids.length);
    const centroidCount = centroids.length;
    for (let centroidIndex = 0; centroidIndex < centroidCount; centroidIndex++) {
      sums[centroidIndex] = { 'a': 0, 'b': 0, 'l': 0, 'weight': 0 };
    }
    const pointCount = points.length;
    for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
      const sum = sums[assignments[pointIndex]!]!;
      const weight = weights[pointIndex]!;
      const point = points[pointIndex]!;
      sum.l += point.l * weight;
      sum.a += point.a * weight;
      sum.b += point.b * weight;
      sum.weight += weight;
    }
    const result = new Array<LabInputEntity.Type>(centroidCount);
    for (let centroidIndex = 0; centroidIndex < centroidCount; centroidIndex++) {
      const sum = sums[centroidIndex]!;
      result[centroidIndex] = sum.weight > 0 ? { 'a': sum.a / sum.weight, 'b': sum.b / sum.weight, 'l': sum.l / sum.weight } : centroids[centroidIndex]!;
    }
    return result;
  }

  static records(centroids: readonly LabInputEntity.Type[], assignments: readonly number[], weights: readonly number[], alphas: readonly number[]): ColorRecordEntity.Type[] {
    const centroidCount = centroids.length;
    const clusterWeights = new Array<number>(centroidCount).fill(0);
    const clusterAlphas = new Array<number>(centroidCount).fill(0);
    const pointCount = assignments.length;
    for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
      const centroidIndex = assignments[pointIndex]!;
      const weight = weights[pointIndex]!;
      clusterWeights[centroidIndex]! += weight;
      clusterAlphas[centroidIndex]! += alphas[pointIndex]! * weight;
    }
    const result: ColorRecordEntity.Type[] = [];
    for (let centroidIndex = 0; centroidIndex < centroidCount; centroidIndex++) {
      const clusterWeight = clusterWeights[centroidIndex]!;
      if (clusterWeight > 0) {
        result.push(PointConversion.toRecord(centroids[centroidIndex]!, clusterAlphas[centroidIndex]! / clusterWeight, clusterWeight));
      }
    }
    return result;
  }
}

const MAXIMUM_ITERATIONS = 20;

/**
 * Weighted Lloyd's-algorithm k-means over OKLCH color records (via their
 * Cartesian L/a/b projection, so hue wraparound never skews distance or the
 * centroid mean). One of four `gallery.algorithm` clustering primitives
 * (alongside median-cut, deltaE-merge, and Wu quantization) — it iteratively
 * refines centroids by squared-distance rather than splitting boxes, so it
 * tends to find a lower-total-error partition at the cost of being
 * iterative instead of one-shot.
 *
 * Seeding is weighted k-means++ (deterministic, no RNG — see
 * `CentroidSeeding.weightedPlusPlus`) so results are reproducible across
 * runs with the same input.
 */
class ClusterKMeans {
  readonly 'name' = 'clusterKMeans';

  apply(colors: readonly ColorRecordEntity.Type[], k: number): ColorRecordEntity.Type[] {
    if (colors.length === 0) {return [];}
    if (k < 1) {
      throw ValidationError.create({
        'message': 'ClusterKMeans.apply: k must be a positive number',
        'path':    'k',
        'violations': [{
          'details': { 'expected': 'k >= 1', 'received': k },
          'message': 'k is not a positive number',
          'path':    'k'
        }]
      });
    }

    const targetCount = Math.min(Math.floor(k), colors.length);
    const points = new Array<LabInputEntity.Type>(colors.length);
    const weights = new Array<number>(colors.length);
    const alphas = new Array<number>(colors.length);
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const color = colors[colorIndex]!;
      points[colorIndex] = Point.to(color);
      weights[colorIndex] = RecordWeight.of(color);
      alphas[colorIndex] = color.alpha;
    }

    let centroids = CentroidSeeding.weightedPlusPlus(points, weights, targetCount);
    const assignments = new Array<number>(points.length).fill(0);
    for (let iteration = 0; iteration < MAXIMUM_ITERATIONS; iteration++) {
      const changed = ClusterSummary.assign(points, centroids, assignments);
      centroids = ClusterSummary.recalculate(points, weights, assignments, centroids);
      if (!changed) {break;}
    }

    const result = ClusterSummary.records(centroids, assignments, weights, alphas);
    return result;
  }
}

/** Singleton instance registered as the `clusterKMeans` math primitive. */
export const clusterKMeans = new ClusterKMeans();
