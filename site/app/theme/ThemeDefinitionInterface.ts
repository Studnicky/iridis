import type { DataLayoutStrategy } from './DataLayoutStrategy.ts';
import type { ParticleRendererInterface } from './particles/interfaces/particleRendererInterface.ts';

/**
 * One visual preset's application-facing port. A theme supplies resolved
 * ambient and layout implementations; it does not transport presentation
 * tokens for downstream components to branch on.
 */
export declare class ThemeDefinitionInterface {
  /** Ambient background parameters read by AmbientBackground.vue. */
  readonly 'ambient': {

    /** Number of glows painted on the ambient canvas. */
    'blobCount': number;

    /** Gaussian blur radius, in CSS pixels, applied to the glows painted on the ambient canvas. */
    'gooBlurPx': number;

    /** Fully resolved CSS display applied to the perspective grid floor. */
    'gridDisplay': string;

    /** Per-layer particle counts (three far layers, two near layers). */
    'particleCounts': number[];

    /** Selected particle renderer implementation. */
    'particleRenderer': ParticleRendererInterface;

    /** Multiplies ambient animation durations. */
    'speedMultiplier': number;
  };


  /** Selected layout implementation for role and palette rows. */
  readonly 'dataLayout': DataLayoutStrategy;


  /** Registry key used for persistence and DOM data attributes. */
  readonly 'key': string;


  /** Human-readable label shown in the theme switcher. */
  readonly 'label': string;
}
