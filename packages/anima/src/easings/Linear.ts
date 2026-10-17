import type { EasingFunctionInterface } from '../interfaces/EasingFunctionInterface.ts';

/** Identity easing: progress advances at a constant rate. */
export const linear: EasingFunctionInterface = Object.freeze({
  'apply': function apply(progress: number): number {
    return progress;
  }
});
