import { ValidationError } from '@studnicky/errors';

import type { ClusterPointEntity } from '../entities/ClusterPointEntity.ts';
import type { ColorRecordInterfaceType } from '../types/index.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';

class RecordWeight {
  static of(record: ColorRecordInterfaceType): number {
    const w = record.hints?.weight;
    return typeof w === 'number' && w > 0 ? w : 1;
  }
}

/** Cartesian (L, a, b) so hue wraparound never distorts distance/mean the way averaging raw hue degrees would. */
class Point {
  static to(record: ColorRecordInterfaceType): ClusterPointEntity.Type {
    const hRad = (record.oklch.h * Math.PI) / 180;
    return { 'a': record.oklch.c * Math.cos(hRad), 'b': record.oklch.c * Math.sin(hRad), 'l': record.oklch.l };
  }
}

class SquaredDistance {
  static between(p: ClusterPointEntity.Type, q: ClusterPointEntity.Type): number {
    const dl = p.l - q.l; const da = p.a - q.a; const db = p.b - q.b;
    return dl * dl + da * da + db * db;
  }
}

class PointConversion {
  static toRecord(p: ClusterPointEntity.Type, alpha: number, weight: number): ColorRecordInterfaceType {
    const c = Math.sqrt(p.a * p.a + p.b * p.b);
    let h = (Math.atan2(p.b, p.a) * 180) / Math.PI;
    if (h < 0) {h += 360;}
    return colorRecordFactory.fromOklch(p.l, c, h, { 'alpha': alpha, 'hints': { 'intent': undefined, 'role': undefined, 'weight': weight }, 'sourceFormat': 'oklch' });
  }
}

/** Weighted k-means++ seeding: each successive centroid is picked with probability proportional to weight × squared distance from the nearest already-chosen centroid, so the initial spread already covers the color space instead of clumping around whichever pixel happens to be first. */
class CentroidSeeding {
  static weightedPlusPlus(points: ClusterPointEntity.Type[], weights: number[], k: number): ClusterPointEntity.Type[] {
    const centroids: ClusterPointEntity.Type[] = [];
    const firstIndex = weights.indexOf(Math.max(...weights));
    centroids.push(points[firstIndex]!);

    while (centroids.length < k) {
      const scores = points.map((p, i) => {
        let minimumDistance = Infinity;
        for (const c of centroids) {
          const d = SquaredDistance.between(p, c);
          if (d < minimumDistance) {minimumDistance = d;}
        }
        return minimumDistance * weights[i]!;
      });
      const total = scores.reduce((s, v) => {return s + v;}, 0);
      if (total <= 0) {
        // Every remaining point coincides with an existing centroid — pick any leftover point.
        const takenIndex = new Set(centroids.map((c) => {const result = points.findIndex((p) => {return p === c;});
          return result;}));
        const nextIndex = points.findIndex((_, i) => {return !takenIndex.has(i);});
        centroids.push(points[nextIndex === -1 ? 0 : nextIndex]!);
        continue;
      }
      let threshold = total / 2; // deterministic (no Math.random dependency) — picks the point at the cumulative-weight midpoint of the score distribution.
      let chosen = points[0]!;
      const pointsLength = points.length;
      for (let i = 0; i < pointsLength; i++) {
        threshold -= scores[i]!;
        if (threshold <= 0) { chosen = points[i]!; break; }
      }
      centroids.push(chosen);
    }
    return centroids;
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

  apply(colors: readonly ColorRecordInterfaceType[], k: number): ColorRecordInterfaceType[] {
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

    const targetK = Math.min(Math.floor(k), colors.length);
    const points = colors.map(Point.to);
    const weights = colors.map((c) => {const result = RecordWeight.of(c); return result;});
    const alphas = colors.map((c) => {const result = c.alpha;
      return result;});

    let centroids = CentroidSeeding.weightedPlusPlus(points, weights, targetK);
    const assignments = new Array<number>(points.length).fill(0);

    for (let iter = 0; iter < MAXIMUM_ITERATIONS; iter++) {
      let changed = false;
      const pointsLength = points.length;
      for (let i = 0; i < pointsLength; i++) {
        let bestIndex = 0; let bestDist = Infinity;
        const centroidsLength = centroids.length;
        for (let ci = 0; ci < centroidsLength; ci++) {
          const d = SquaredDistance.between(points[i]!, centroids[ci]!);
          if (d < bestDist) { bestDist = d; bestIndex = ci; }
        }
        if (assignments[i] !== bestIndex) { assignments[i] = bestIndex; changed = true; }
      }

      const sums = centroids.map(() => {return { 'a': 0, 'b': 0, 'l': 0, 'w': 0 };});
      const pointsLengthForSums = points.length;
      for (let i = 0; i < pointsLengthForSums; i++) {
        const s = sums[assignments[i]!]!;
        const w = weights[i]!;
        s.l += points[i]!.l * w;
        s.a += points[i]!.a * w;
        s.b += points[i]!.b * w;
        s.w += w;
      }
      centroids = sums.map((s, ci) => {return s.w > 0 ? { 'a': s.a / s.w, 'b': s.b / s.w, 'l': s.l / s.w } : centroids[ci]!;});

      if (!changed) {break;}
    }

    const clusterWeight = new Array<number>(centroids.length).fill(0);
    const clusterAlpha = new Array<number>(centroids.length).fill(0);
    const pointsLengthForWeights = points.length;
    for (let i = 0; i < pointsLengthForWeights; i++) {
      const ci = assignments[i]!;
      clusterWeight[ci]! += weights[i]!;
      clusterAlpha[ci]! += alphas[i]! * weights[i]!;
    }

    return centroids.reduce<ColorRecordInterfaceType[]>((accumulated, c, ci) => {
      if (clusterWeight[ci]! > 0) {
        accumulated.push(PointConversion.toRecord(c, clusterAlpha[ci]! / clusterWeight[ci]!, clusterWeight[ci]!));
      }
      return accumulated;
    }, []);
  }
}

/** Singleton instance registered as the `clusterKMeans` math primitive. */
export const clusterKMeans = new ClusterKMeans();
