import type { ParticleElementInterface } from './particleElementInterface.ts';

/**
 * The exclusive particle rendering payload selected by a renderer. A shadow
 * surface paints all dots through one CSS box-shadow; an element surface
 * paints independently positioned nodes.
 */
export interface ParticleRenderOutputInterface {
  readonly 'rendering':
    | { readonly 'boxShadow': string; readonly 'surface': 'box-shadow'; }
    | { readonly 'elements': readonly ParticleElementInterface[]; readonly 'surface': 'elements'; };
}
