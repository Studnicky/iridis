/** One positioned particle element — see particleRenderOutput.ts's `elements` variant. */
export namespace ParticleElementType {
  export type Type = { 'glyph': string | undefined; 'id': string; 'style': Record<string, string>; };
}
