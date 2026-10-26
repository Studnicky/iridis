import type { ParticleDotInterface } from './particleDotInterface.ts';
import type { ParticleElementInterface } from './particleElementInterface.ts';

/**
 * The exclusive particle rendering payload selected by a renderer. A dots
 * surface is painted by the ambient canvas from viewport-unit placements; an
 * element surface paints independently positioned nodes.
 */
export interface ParticleRenderOutputInterface {
  readonly 'rendering':
    | { readonly 'blurPx': number;
      readonly 'colorVar': string;
      readonly 'dots': readonly ParticleDotInterface[];
      readonly 'surface': 'dots'; }
      | { readonly 'elements': readonly ParticleElementInterface[];
        readonly 'surface': 'elements'; };
}
