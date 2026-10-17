import { ValidationError } from '@studnicky/errors/node';

import type { ClusterMergeEntity } from '../entities/ClusterMergeEntity.ts';
import type { ColorHintsInterfaceTypeEntity } from '../entities/ColorHintsInterfaceTypeEntity.ts';

import { ColorRecordInterfaceTypeEntity } from '../entities/ColorRecordInterfaceTypeEntity.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';
import { deltaE2000 } from './DeltaE2000.ts';

class RecordWeight {
  static of(record: ColorRecordInterfaceTypeEntity.Type): number {
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
  static asClusters(colors: readonly ColorRecordInterfaceTypeEntity.Type[]): ClusterMergeEntity.Type[] {
    const result = new Array<ClusterMergeEntity.Type>(colors.length);
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const color = colors[colorIndex]!;
      result[colorIndex] = { 'centroid': color, 'weight': RecordWeight.of(color) };
    }
    return result;
  }

  static withMergedPair(
    clusters: readonly ClusterMergeEntity.Type[],
    merged: ClusterMergeEntity.Type,
    pair: { 'firstIndex': number; 'secondIndex': number }
  ): ClusterMergeEntity.Type[] {
    const result = new Array<ClusterMergeEntity.Type>(clusters.length - 1);
    let resultIndex = 0;
    const clusterCount = clusters.length;
    for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex++) {
      if (clusterIndex === pair.firstIndex) {
        result[resultIndex] = merged;
        resultIndex += 1;
      } else if (clusterIndex !== pair.secondIndex) {
        result[resultIndex] = clusters[clusterIndex]!;
        resultIndex += 1;
      }
    }
    return result;
  }

  static withWeights(colors: readonly ColorRecordInterfaceTypeEntity.Type[]): ColorRecordInterfaceTypeEntity.Type[] {
    const result = new Array<ColorRecordInterfaceTypeEntity.Type>(colors.length);
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      const color = colors[colorIndex]!;
      if (typeof color.hints?.weight === 'number' && color.hints.weight > 0) {
        result[colorIndex] = color;
        continue;
      }
      const hints: ColorHintsInterfaceTypeEntity.Type = { 'weight': 1 };
      if (color.hints?.intent !== undefined) {hints.intent = color.hints.intent;}
      if (color.hints?.role !== undefined) {hints.role = color.hints.role;}
      result[colorIndex] = colorRecordFactory.fromOklch(color.oklch.l, color.oklch.c, color.oklch.h, { 'alpha': color.alpha, 'hints': hints, 'sourceFormat': color.sourceFormat });
    }
    return result;
  }
}

class ClosestPair {
  static of(clusters: readonly ClusterMergeEntity.Type[]): { 'firstIndex': number; 'secondIndex': number } {
    let firstIndex = 0;
    let secondIndex = 1;
    let minimumDistance = Infinity;
    const clusterCount = clusters.length;
    for (let outerIndex = 0; outerIndex < clusterCount; outerIndex++) {
      const first = clusters[outerIndex];
      if (first === undefined) {continue;}
      for (let innerIndex = outerIndex + 1; innerIndex < clusterCount; innerIndex++) {
        const second = clusters[innerIndex];
        if (second === undefined) {continue;}
        const rawDistance = deltaE2000.apply(
          ColorRecordInterfaceTypeEntity.intake(first.centroid),
          ColorRecordInterfaceTypeEntity.intake(second.centroid)
        );
        const distance = Number.isFinite(rawDistance) ? rawDistance : Infinity;
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
 * Complexity is O(N² log N) due to repeated nearest-pair scans;
 * intended for ≤ a few hundred input bins (i.e., post-histogram).
 * Calling against raw pixel arrays will be slow; feed it the output
 * of `gallery:histogram` instead.
 */
class ClusterDeltaEMerge {
  readonly 'name' = 'clusterDeltaEMerge';

  apply(colors: readonly ColorRecordInterfaceTypeEntity.Type[], k: number): ColorRecordInterfaceTypeEntity.Type[] {
    if (colors.length === 0) {
      const result: ColorRecordInterfaceTypeEntity.Type[] = [];
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

    let clusters = ClusterRecords.asClusters(colors);
    while (clusters.length > targetCount) {
      const pair = ClosestPair.of(clusters);
      const first = clusters[pair.firstIndex];
      const second = clusters[pair.secondIndex];
      if (first === undefined || second === undefined) {break;}
      const merged = Centroids.merge(first, second);
      clusters = ClusterRecords.withMergedPair(clusters, merged, pair);
    }

    const result = new Array<ColorRecordInterfaceTypeEntity.Type>(clusters.length);
    const clusterCount = clusters.length;
    for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex++) {
      result[clusterIndex] = ColorRecordInterfaceTypeEntity.intake(clusters[clusterIndex]!.centroid);
    }
    return result;
  }
}

/** Singleton instance registered as the `clusterDeltaEMerge` math primitive. */
export const clusterDeltaEMerge = new ClusterDeltaEMerge();
