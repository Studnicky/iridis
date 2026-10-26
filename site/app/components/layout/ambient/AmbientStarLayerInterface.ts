import type { ParticleDotInterface } from '~/theme/particles/interfaces/particleDotInterface.ts';

/** One starfield layer painted on the star canvas; durations are in seconds before the theme speed multiplier, and a negative rotation duration turns the layer the other way. */
export interface AmbientStarLayerInterface {
  readonly 'blurPx': number;
  readonly 'color': string;
  readonly 'diameterPx': number;
  readonly 'dots': readonly ParticleDotInterface[];
  readonly 'rotateSeconds': number;
  readonly 'twinkleDelaySeconds': number;
  readonly 'twinkleSeconds': number;
}
