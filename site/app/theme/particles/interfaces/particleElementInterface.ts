/** One positioned particle element — see particleRenderOutput.ts's `elements` variant. */
export interface ParticleElementInterface {
  readonly 'glyph': string | undefined;
  readonly 'id': string;
  readonly 'style': Readonly<Record<string, string>>;
}
