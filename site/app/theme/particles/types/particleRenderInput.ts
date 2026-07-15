/** The port every particle-shape adapter implements — see ../types/particleRenderer.ts's `ParticleRendererType`. */
export type ParticleRenderInputType = {
  /** CSS blur radius the box-shadow variant uses (ignored by element-based shapes). */
  'blur': string;
  /** CSS color value (already a color-mix()/var() expression). */
  'colorVar': string;
  /** How many particles to place. */
  'count': number;
  /** Base particle size in px (glyph font-size or shape width/height). */
  'sizePx': number;
};
