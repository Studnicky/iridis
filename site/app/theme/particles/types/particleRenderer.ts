import type { ParticleRenderInputType } from './particleRenderInput.ts';
import type { ParticleRenderOutputType } from './particleRenderOutput.ts';

/** Dispatched by shape key via a lookup map (see ../index.ts) — never branched on inline. */
export type ParticleRendererType = (input: ParticleRenderInputType) => ParticleRenderOutputType;
