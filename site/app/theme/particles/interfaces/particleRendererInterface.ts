import type { ParticleRenderInputInterface } from './particleRenderInputInterface.ts';
import type { ParticleRenderOutputInterface } from './particleRenderOutputInterface.ts';

/** Dispatched by shape selection via a lookup map (see ../index.ts). */
export interface ParticleRendererInterface {
  render(input: ParticleRenderInputInterface): ParticleRenderOutputInterface;
}
