/**
 * Random NEGATIVE animation-delay (a la lavaBlobs()' per-blob stagger) — every
 * element-based shape uses this so particles desync regardless of which
 * theme's own keyframe/duration ends up driving them (direction/style is the
 * theme's concern; per-particle jitter is the shape's).
 */
class RandomDelayOperation {
  static run(maximumSeconds: number): string {
    const result = `-${(Math.random() * maximumSeconds).toFixed(2)}s`;
    return result;
  }
}

export const randomDelay = RandomDelayOperation.run;
