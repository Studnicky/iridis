import type { ClusterStrategyInterface } from '@studnicky/iridis-image';

import { ClusterDispatcher } from '@studnicky/iridis-image';

class AlgorithmItem {
  public readonly label: string;
  public readonly strategy: ClusterStrategyInterface;

  public constructor(label: string, strategy: ClusterStrategyInterface) {
    this.label = label;
    this.strategy = strategy;
  }
}

/** Resolved clustering implementations for the algorithm selector. */
export const ALGORITHM_ITEMS: AlgorithmItem[] = [
  new AlgorithmItem('ΔE (delta-e)', ClusterDispatcher.resolve('delta-e')),
  new AlgorithmItem('Median cut', ClusterDispatcher.resolve('median-cut')),
  new AlgorithmItem('Wu quantize', ClusterDispatcher.resolve('wu-quantize')),
  new AlgorithmItem('K-means', ClusterDispatcher.resolve('k-means'))
];
