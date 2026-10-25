import type { ColorRecordEntity } from '@studnicky/iridis';
import type { JSONSchema7Type } from 'json-schema';

import {
  clusterDeltaEMerge,
  clusterKMeans,
  clusterMedianCut,
  clusterMedianCutWeighted,
  clusterWuQuantize
} from '@studnicky/iridis';

import type { ClusterStrategyInterface } from './ClusterStrategyInterface.ts';

import { GalleryAlgorithmTypeEntity } from '../entities/GalleryAlgorithmTypeEntity.ts';
import { CLUSTER_DISPATCHER_DEFAULTS } from './constants/ClusterDispatcherDefaults.ts';

/**
 * `ClusterDispatcher`
 *
 * Shared per-algorithm clustering dispatch used by both `gallery:extract`
 * (destructive, single-result) and `gallery:extractCandidates`
 * (non-destructive, multi-result). Selects one of four clustering
 * primitives by `algorithm` and applies weight-aware trimming ahead of
 * the deltaE-merge path.
 */
class DeltaEStrategy implements ClusterStrategyInterface {
  apply(colors: readonly ColorRecordEntity.Type[], k: number, deltaECap: number | undefined): ColorRecordEntity.Type[] {
    const result = ClusterDispatcher.deltaE(colors, k, { 'deltaECap': deltaECap, 'onTrim': undefined });
    return result;
  }

  serializeAlgorithm(): GalleryAlgorithmTypeEntity.Type {
    const result = GalleryAlgorithmTypeEntity.intake('delta-e');
    return result;
  }
}

class KMeansStrategy implements ClusterStrategyInterface {
  apply(colors: readonly ColorRecordEntity.Type[], k: number, _deltaECap: number | undefined): ColorRecordEntity.Type[] {
    const result = ClusterDispatcher.kMeans(colors, k);
    return result;
  }

  serializeAlgorithm(): GalleryAlgorithmTypeEntity.Type {
    const result = GalleryAlgorithmTypeEntity.intake('k-means');
    return result;
  }
}

class MedianCutStrategy implements ClusterStrategyInterface {
  apply(colors: readonly ColorRecordEntity.Type[], k: number, _deltaECap: number | undefined): ColorRecordEntity.Type[] {
    const result = ClusterDispatcher.medianCut(colors, k);
    return result;
  }

  serializeAlgorithm(): GalleryAlgorithmTypeEntity.Type {
    const result = GalleryAlgorithmTypeEntity.intake('median-cut');
    return result;
  }
}

class WuQuantizeStrategy implements ClusterStrategyInterface {
  apply(colors: readonly ColorRecordEntity.Type[], k: number, _deltaECap: number | undefined): ColorRecordEntity.Type[] {
    const result = ClusterDispatcher.wuQuantize(colors, k);
    return result;
  }

  serializeAlgorithm(): GalleryAlgorithmTypeEntity.Type {
    const result = GalleryAlgorithmTypeEntity.intake('wu-quantize');
    return result;
  }
}

class ClusterDispatcher {
  static resolve(value: JSONSchema7Type): ClusterStrategyInterface {
    const algorithm = GalleryAlgorithmTypeEntity.intake(value);
    if (algorithm === GalleryAlgorithmTypeEntity.intake('delta-e')) {return new DeltaEStrategy();}
    if (algorithm === GalleryAlgorithmTypeEntity.intake('k-means')) {return new KMeansStrategy();}
    if (algorithm === GalleryAlgorithmTypeEntity.intake('wu-quantize')) {return new WuQuantizeStrategy();}
    return new MedianCutStrategy();
  }

  /**
   * True when ANY input carries a declared `hints.weight`. The presence of
   * the hint key is the signal (not its magnitude), so a histogram where
   * every bin happens to hold exactly one pixel still dispatches to the
   * weighted reducer, preserving the upstream histogram's weight bookkeeping
   * instead of silently falling back to the unweighted `clusterMedianCut`.
   */
  private static hasAnyWeight(colors: readonly ColorRecordEntity.Type[]): boolean {
    for (let index = 0; index < colors.length; index += 1) {
      const color = colors[index];
      if (color !== undefined && typeof color.hints?.weight === 'number' && color.hints.weight > 0) {
        return true;
      }
    }
    return false;
  }

  private static trimRank(color: ColorRecordEntity.Type): number {
    const weight = color.hints?.weight ?? 1;
    const result = Math.sqrt(weight);
    return result;
  }

  private static trimByWeightDescending(colors: readonly ColorRecordEntity.Type[], cap: number): readonly ColorRecordEntity.Type[] {
    if (colors.length <= cap) {return colors;}
    const chromatic: ColorRecordEntity.Type[] = [];
    const neutral: ColorRecordEntity.Type[] = [];
    for (let index = 0; index < colors.length; index += 1) {
      const color = colors[index];
      if (color === undefined) {
        continue;
      }
      if (color.oklch.c >= CLUSTER_DISPATCHER_DEFAULTS.CHROMA_EPSILON) {chromatic.push(color);} else {neutral.push(color);}
    }
    chromatic.sort((a, b) => {
      const result = ClusterDispatcher.trimRank(b) - ClusterDispatcher.trimRank(a);
      return result;
    });
    neutral.sort((a, b) => {
      const result = ClusterDispatcher.trimRank(b) - ClusterDispatcher.trimRank(a);
      return result;
    });
    const result = [...chromatic, ...neutral].slice(0, cap);
    return result;
  }

  static deltaE(
    colors: readonly ColorRecordEntity.Type[],
    k: number,
    options?: {
      'deltaECap': number | undefined;
      'onTrim': { log(before: number, after: number, cap: number): void } | undefined;
    }
  ): ColorRecordEntity.Type[] {
    const clamp = Math.min(k, colors.length);
    const cap = Math.max(8, Math.min(512, Math.floor(options?.deltaECap ?? CLUSTER_DISPATCHER_DEFAULTS.DELTA_E_INPUT_CAP_DEFAULT)));
    const trimmed = ClusterDispatcher.trimByWeightDescending(colors, cap);
    if (trimmed.length < colors.length && options?.onTrim !== undefined) {
      options.onTrim.log(colors.length, trimmed.length, cap);
    }
    const result = clusterDeltaEMerge.apply(trimmed, clamp);
    return result;
  }

  static kMeans(colors: readonly ColorRecordEntity.Type[], k: number): ColorRecordEntity.Type[] {
    const clamp = Math.min(k, colors.length);
    const result = clusterKMeans.apply(colors, clamp);
    return result;
  }

  static medianCut(colors: readonly ColorRecordEntity.Type[], k: number): ColorRecordEntity.Type[] {
    const clamp = Math.min(k, colors.length);
    if (ClusterDispatcher.hasAnyWeight(colors)) {
      const result = clusterMedianCutWeighted.apply(colors, clamp);
      return result;
    }
    const result = clusterMedianCut.apply(colors, clamp);
    return result;
  }

  static wuQuantize(colors: readonly ColorRecordEntity.Type[], k: number): ColorRecordEntity.Type[] {
    const clamp = Math.min(k, colors.length);
    const result = clusterWuQuantize.apply(colors, clamp);
    return result;
  }
}

export { ClusterDispatcher };
