import { ValidationError } from '@studnicky/errors';

import type { ColorRecordInterfaceType } from '../types/index.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';

type PointInterface = { 'a': number; 'b': number; 'l': number; };

function recordWeight(record: ColorRecordInterfaceType): number {
  const w = record.hints?.weight;
  return typeof w === 'number' && w > 0 ? w : 1;
}

/** Cartesian (L, a, b) so hue wraparound never distorts distance/mean the way averaging raw hue degrees would. */
class Point {
  static to(record: ColorRecordInterfaceType): PointInterface {
    const hRad = (record.oklch.h * Math.PI) / 180;
    return { 'a': record.oklch.c * Math.cos(hRad), 'b': record.oklch.c * Math.sin(hRad), 'l': record.oklch.l };
  }
}

function sqDist(p: PointInterface, q: PointInterface): number {
  const dl = p.l - q.l; const da = p.a - q.a; const db = p.b - q.b;
  return dl * dl + da * da + db * db;
}

function pointToRecord(p: PointInterface, alpha: number, weight: number): ColorRecordInterfaceType {
  const c = Math.sqrt(p.a * p.a + p.b * p.b);
  let h = (Math.atan2(p.b, p.a) * 180) / Math.PI;
  if (h < 0) {h += 360;}
  return colorRecordFactory.fromOklch(p.l, c, h, { 'alpha': alpha, 'hints': { 'intent': undefined, 'role': undefined, 'weight': weight }, 'sourceFormat': 'oklch' });
}

/** Weighted k-means++ seeding: each successive centroid is picked with probability proportional to weight × squared distance from the nearest already-chosen centroid, so the initial spread already covers the color space instead of clumping around whichever pixel happens to be first. */
function seedCentroids(points: PointInterface[], weights: number[], k: number): PointInterface[] {
  const centroids: PointInterface[] = [];
  const firstIdx = weights.indexOf(Math.max(...weights));
  centroids.push(points[firstIdx]!);

  while (centroids.length < k) {
    const scores = points.map((p, i) => {
      let minD = Infinity;
      for (const c of centroids) {
        const d = sqDist(p, c);
        if (d < minD) {minD = d;}
      }
      return minD * weights[i]!;
    });
    const total = scores.reduce((s, v) => {return s + v;}, 0);
    if (total <= 0) {
      // Every remaining point coincides with an existing centroid — pick any leftover point.
      const takenIdx = new Set(centroids.map((c) => {const result = points.findIndex((p) => {return p === c;});
        return result;}));
      const nextIdx = points.findIndex((_, i) => {return !takenIdx.has(i);});
      centroids.push(points[nextIdx === -1 ? 0 : nextIdx]!);
      continue;
    }
    let threshold = total / 2; // deterministic (no Math.random dependency) — picks the point at the cumulative-weight midpoint of the score distribution.
    let chosen = points[0]!;
    for (let i = 0; i < points.length; i++) {
      threshold -= scores[i]!;
      if (threshold <= 0) { chosen = points[i]!; break; }
    }
    centroids.push(chosen);
  }
  return centroids;
}

const MAX_ITERATIONS = 20;

/**
 * Weighted Lloyd's-algorithm k-means over OKLCH color records (via their
 * Cartesian L/a/b projection, so hue wraparound never skews distance or the
 * centroid mean). One of four `gallery.algorithm` clustering primitives
 * (alongside median-cut, deltaE-merge, and Wu quantization) — it iteratively
 * refines centroids by squared-distance rather than splitting boxes, so it
 * tends to find a lower-total-error partition at the cost of being
 * iterative instead of one-shot.
 *
 * Seeding is weighted k-means++ (deterministic, no RNG — see seedCentroids)
 * so results are reproducible across runs with the same input.
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
    const weights = colors.map(recordWeight);
    const alphas = colors.map((c) => {const result = c.alpha;
      return result;});

    let centroids = seedCentroids(points, weights, targetK);
    const assignments = new Array<number>(points.length).fill(0);

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      let changed = false;
      for (let i = 0; i < points.length; i++) {
        let bestIdx = 0; let bestDist = Infinity;
        for (let ci = 0; ci < centroids.length; ci++) {
          const d = sqDist(points[i]!, centroids[ci]!);
          if (d < bestDist) { bestDist = d; bestIdx = ci; }
        }
        if (assignments[i] !== bestIdx) { assignments[i] = bestIdx; changed = true; }
      }

      const sums = centroids.map(() => {return { 'a': 0, 'b': 0, 'l': 0, 'w': 0 };});
      for (let i = 0; i < points.length; i++) {
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
    for (let i = 0; i < points.length; i++) {
      const ci = assignments[i]!;
      clusterWeight[ci]! += weights[i]!;
      clusterAlpha[ci]! += alphas[i]! * weights[i]!;
    }

    return centroids
      .map((c, ci) => {return clusterWeight[ci]! > 0 ? pointToRecord(c, clusterAlpha[ci]! / clusterWeight[ci]!, clusterWeight[ci]!) : null;})
      .filter((r): r is ColorRecordInterfaceType => {return r !== null;});
  }
}

/** Singleton instance registered as the `clusterKMeans` math primitive. */
export const clusterKMeans = new ClusterKMeans();
