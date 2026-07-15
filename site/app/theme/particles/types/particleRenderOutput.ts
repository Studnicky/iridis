import type { ParticleElementType } from './particleElement.ts';

/**
 * `dot` renders as a single `box-shadow` string (hundreds of dots painted via
 * one CSS property — the cheap technique, but a box-shadow always takes its
 * casting element's own shape, so it's the only shape that CAN use it).
 * Every other shape renders as real positioned elements instead.
 */
export type ParticleRenderOutputType =
  | { 'boxShadow': string; 'kind': 'boxShadow'; }
  | { 'elements': ParticleElementType[]; 'kind': 'elements'; };
