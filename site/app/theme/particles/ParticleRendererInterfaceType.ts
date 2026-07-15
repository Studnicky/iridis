/**
 * The port every particle-shape adapter implements. `dot` renders as a single
 * `box-shadow` string (hundreds of dots painted via one CSS property — the
 * cheap technique, but a box-shadow always takes its casting element's own
 * shape, so it's the only shape that CAN use it). Every other shape renders
 * as real positioned elements instead. Dispatched by shape key via a lookup
 * map (see ./index.ts) — never branched on inline.
 */
export type ParticleRenderInputType = {
  /** How many particles to place. */
  'count': number;
  /** CSS color value (already a color-mix()/var() expression). */
  'colorVar': string;
  /** Base particle size in px (glyph font-size or shape width/height). */
  'sizePx': number;
  /** CSS blur radius the box-shadow variant uses (ignored by element-based shapes). */
  'blur': string;
};

export type ParticleElementType = { 'id': string; 'style': Record<string, string>; 'glyph'?: string };

export type ParticleRenderOutputType =
  | { 'kind': 'boxShadow'; 'boxShadow': string }
  | { 'kind': 'elements'; 'elements': ReadonlyArray<ParticleElementType> };

export type ParticleRendererType = (input: ParticleRenderInputType) => ParticleRenderOutputType;

/** Shared placement helper every renderer uses — a viewport-relative (vw/vh) position so the field scales with the window instead of clipping on a fixed px canvas. */
export function randomPlacement(): { 'x': string; 'y': string } {
  return { 'x': (Math.random() * 100).toFixed(2), 'y': (Math.random() * 100).toFixed(2) };
}

/**
 * Random NEGATIVE animation-delay (a la lavaBlobs()' per-blob stagger) — every
 * element-based shape uses this so particles desync regardless of which
 * theme's own keyframe/duration ends up driving them (direction/style is the
 * theme's concern; per-particle jitter is the shape's).
 */
export function randomDelay(maxSeconds: number): string {
  return `-${(Math.random() * maxSeconds).toFixed(2)}s`;
}
