import type { EasingFunctionInterface } from './EasingFunctionInterface.ts';
import type { HueInterpolationInterface } from './HueInterpolationInterface.ts';

/** Optional controls for evaluated palette curves. */
export interface CurveOptionsInterface {
  readonly 'chromaticDetourRoles'?: readonly string[];
  readonly 'easing'?: EasingFunctionInterface;
  readonly 'hueInterpolation'?: HueInterpolationInterface;
}
