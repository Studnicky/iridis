import { ValidationError } from '@studnicky/errors/node';

import type { ClusterMergeEntity } from '../entities/ClusterMergeEntity.ts';
import type { ColorHintsEntity } from '../entities/ColorHintsEntity.ts';

import { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';
import { deltaE2000 } from './DeltaE2000.ts';

class RecordWeight {
  static of(record: ColorRecordEntity.Type): number {
    const w = record.hints?.weight;
    const result = typeof w === 'number' && w > 0 ? w : 1;
    return result;
  }
}

/**
 * Builds a centroid record from two clusters by weighted-averaging in
 * OKLab space (a*, b* are the rectangular Cartesian projection of
 * chroma+hue) so hue wrap-around is handled by the projection rather
 * than by a circular-mean correction.
 */
class Centroids {
  static merge(a: ClusterMergeEntity.Type, b: ClusterMergeEntity.Type): ClusterMergeEntity.Type {
    // Treat zero-weight inputs as weight=1 so the weighted average stays
    // defined. A zero-weight cluster is degenerate (the upstream task
    // should not produce one), but guarding here keeps a single bad input
    // from NaN-poisoning every subsequent merge.
    const wa = a.weight > 0 ? a.weight : 1;
    const wb = b.weight > 0 ? b.weight : 1;
    const tot = wa + wb;
    const aRad = (a.centroid.oklch.h * Math.PI) / 180;
    const bRad = (b.centroid.oklch.h * Math.PI) / 180;
    const aA = a.centroid.oklch.c * Math.cos(aRad);
    const aB = a.centroid.oklch.c * Math.sin(aRad);
    const bA = b.centroid.oklch.c * Math.cos(bRad);
    const bB = b.centroid.oklch.c * Math.sin(bRad);
    const L = (a.centroid.oklch.l * wa + b.centroid.oklch.l * wb) / tot;
    const aMean = (aA * wa + bA * wb) / tot;
    const bMean = (aB * wa + bB * wb) / tot;
    const C = Math.sqrt(aMean * aMean + bMean * bMean);
    let H = (Math.atan2(bMean, aMean) * 180) / Math.PI;
    if (H < 0) {H += 360;}
    const alpha = (a.centroid.alpha * wa + b.centroid.alpha * wb) / tot;
    return {
      'centroid': colorRecordFactory.fromOklch(L, C, H, { 'alpha': alpha, 'hints': { 'weight': tot }, 'sourceFormat': 'oklch' }),
      'weight':   tot
    };
  }
}

class ClusterRecords {
  static asClusters(colors: readonly ColorRecordEntity.Type[]): ClusterMergeEntity.Type[] {
    const result = new Array<ClusterMergeEntity.Type>(colors.length);
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const color = colors[colorIndex]!;
      result[colorIndex] = { 'centroid': color, 'weight': RecordWeight.of(color) };
    }
    return result;
  }

  static withWeights(colors: readonly ColorRecordEntity.Type[]): ColorRecordEntity.Type[] {
    const result = new Array<ColorRecordEntity.Type>(colors.length);
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const color = colors[colorIndex]!;
      if (typeof color.hints?.weight === 'number' && color.hints.weight > 0) {
        result[colorIndex] = color;
        continue;
      }
      const hints: ColorHintsEntity.Type = { 'weight': 1 };
      if (color.hints?.intent !== undefined) {hints.intent = color.hints.intent;}
      if (color.hints?.role !== undefined) {hints.role = color.hints.role;}
      result[colorIndex] = colorRecordFactory.fromOklch(color.oklch.l, color.oklch.c, color.oklch.h, { 'alpha': color.alpha, 'hints': hints, 'sourceFormat': color.sourceFormat });
    }
    return result;
  }
}

/**
 * Pairwise deltaE2000 distances between live clusters, computed once per
 * pair and updated only for the merged cluster. Slot ids are the original
 * input indices; live slots stay in ascending order, so slot order equals
 * cluster order and ties resolve to the first minimum in row-major scan.
 */
class ClusterDistanceMatrix {
  readonly #active: number[];
  readonly #clusters: ClusterMergeEntity.Type[];
  readonly #distances: Float64Array;
  readonly #records: ColorRecordEntity.Type[];
  readonly #size: number;

  private constructor(clusters: readonly ClusterMergeEntity.Type[]) {
    this.#size = clusters.length;
    this.#clusters = [...clusters];
    this.#active = new Array<number>(this.#size);
    this.#records = new Array<ColorRecordEntity.Type>(this.#size);
    for (let slot = 0; slot < this.#size; slot++) {
      this.#active[slot] = slot;
      this.#records[slot] = ColorRecordEntity.intake(clusters[slot]!.centroid);
    }
    this.#distances = new Float64Array(this.#size * this.#size);
    for (let first = 0; first < this.#size; first++) {
      for (let second = first + 1; second < this.#size; second++) {
        this.#distances[first * this.#size + second] = this.#measure(first, second);
      }
    }
  }

  static of(clusters: readonly ClusterMergeEntity.Type[]): ClusterDistanceMatrix {
    const result = new ClusterDistanceMatrix(clusters);
    return result;
  }

  get count(): number {
    const result = this.#active.length;
    return result;
  }

  clusters(): ClusterMergeEntity.Type[] {
    const result = this.#active.map((slot) => {return this.#clusters[slot]!;});
    return result;
  }

  closestPair(): { 'firstIndex': number; 'secondIndex': number } {
    let firstIndex = 0;
    let secondIndex = 1;
    let minimumDistance = Infinity;
    const activeCount = this.#active.length;
    for (let outerIndex = 0; outerIndex < activeCount; outerIndex++) {
      const row = this.#active[outerIndex]! * this.#size;
      for (let innerIndex = outerIndex + 1; innerIndex < activeCount; innerIndex++) {
        const distance = this.#distances[row + this.#active[innerIndex]!]!;
        if (distance < minimumDistance) {
          minimumDistance = distance;
          firstIndex = outerIndex;
          secondIndex = innerIndex;
        }
      }
    }
    const result = { 'firstIndex': firstIndex, 'secondIndex': secondIndex };
    return result;
  }

  merge(pair: { 'firstIndex': number; 'secondIndex': number }): void {
    const keptSlot = this.#active[pair.firstIndex]!;
    const absorbedSlot = this.#active[pair.secondIndex]!;
    const merged = Centroids.merge(this.#clusters[keptSlot]!, this.#clusters[absorbedSlot]!);
    this.#clusters[keptSlot] = merged;
    this.#records[keptSlot] = ColorRecordEntity.intake(merged.centroid);
    this.#active.splice(pair.secondIndex, 1);
    const activeCount = this.#active.length;
    for (let activeIndex = 0; activeIndex < activeCount; activeIndex++) {
      const slot = this.#active[activeIndex]!;
      if (slot < keptSlot) {
        this.#distances[slot * this.#size + keptSlot] = this.#measure(slot, keptSlot);
      } else if (slot > keptSlot) {
        this.#distances[keptSlot * this.#size + slot] = this.#measure(keptSlot, slot);
      }
    }
  }

  #measure(earlierSlot: number, laterSlot: number): number {
    const rawDistance = deltaE2000.apply(this.#records[earlierSlot]!, this.#records[laterSlot]!);
    const result = Number.isFinite(rawDistance) ? rawDistance : Infinity;
    return result;
  }
}

/**
 * Agglomerative deltaE2000 clustering. Each input record starts as its
 * own cluster; the algorithm repeatedly merges the closest pair (in
 * deltaE2000) until exactly K clusters remain. Distances are recomputed
 * for the new centroid after every merge.
 *
 * Output records carry `hints.weight` set to the cluster's total
 * weight (sum of input weights). The cluster that absorbed the most
 * pixels comes out heaviest, irrespective of merge order.
 *
 * Complexity is O(N²) deltaE evaluations (each pair measured once, only
 * the merged cluster re-measured per merge) plus an O(N³) float scan;
 * intended for ≤ a few hundred input bins (i.e., post-histogram).
 * Calling against raw pixel arrays will be slow; feed it the output
 * of `gallery:histogram` instead.
 */
class ClusterDeltaEMerge {
  readonly 'name' = 'clusterDeltaEMerge';

  apply(colors: readonly ColorRecordEntity.Type[], k: number): ColorRecordEntity.Type[] {
    if (colors.length === 0) {
      const result: ColorRecordEntity.Type[] = [];
      return result;
    }
    if (k < 1) {
      throw ValidationError.create({
        'message': 'ClusterDeltaEMerge.apply: k must be a positive number',
        'path':    'k',
        'violations': [{
          'details': { 'expected': 'k >= 1', 'received': k },
          'message': 'k is not a positive number',
          'path':    'k'
        }]
      });
    }
    const targetCount = Math.min(Math.floor(k), colors.length);
    if (targetCount >= colors.length) {
      const result = ClusterRecords.withWeights(colors);
      return result;
    }

    const matrix = ClusterDistanceMatrix.of(ClusterRecords.asClusters(colors));
    while (matrix.count > targetCount) {
      matrix.merge(matrix.closestPair());
    }
    const clusters = matrix.clusters();

    const result = new Array<ColorRecordEntity.Type>(clusters.length);
    const clusterCount = clusters.length;
    for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex++) {
      result[clusterIndex] = ColorRecordEntity.intake(clusters[clusterIndex]!.centroid);
    }
    return result;
  }
}

/** Singleton instance registered as the `clusterDeltaEMerge` math primitive. */
export const clusterDeltaEMerge = new ClusterDeltaEMerge();
