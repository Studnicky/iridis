/** The port every particle-shape adapter implements — see ../types/particleRenderer.ts's `ParticleRendererType`. */
export declare class ParticleRenderInputType {
  /** CSS blur radius the box-shadow variant uses (ignored by element-based shapes). */
  readonly 'blur': string;
  /** CSS color value (already a color-mix()/var() expression). */
  readonly 'colorVar': string;
  /** How many particles to place. */
  readonly 'count': number;
  /** Base particle size in px (glyph font-size or shape width/height). */
  readonly 'sizePx': number;
}
