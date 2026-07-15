/**
 * Random NEGATIVE animation-delay (a la lavaBlobs()' per-blob stagger) — every
 * element-based shape uses this so particles desync regardless of which
 * theme's own keyframe/duration ends up driving them (direction/style is the
 * theme's concern; per-particle jitter is the shape's).
 */
export function randomDelay(maxSeconds: number): string {
  const result = `-${(Math.random() * maxSeconds).toFixed(2)}s`;
  return result;
}
