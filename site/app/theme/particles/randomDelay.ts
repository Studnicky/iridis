import { randomUnitInterval } from './randomUnitInterval.ts';

/**
 * Random NEGATIVE animation-delay — every
 * element-based shape uses this so particles desync regardless of which
 * theme's own keyframe/duration ends up driving them (direction/style is the
 * theme's concern; per-particle jitter is the shape's).
 */
class RandomDelayOperation {
  static run(maximumSeconds: number): string {
    const result = `-${(randomUnitInterval() * maximumSeconds).toFixed(2)}s`;
    return result;
  }
}

export const randomDelay = RandomDelayOperation.run;
