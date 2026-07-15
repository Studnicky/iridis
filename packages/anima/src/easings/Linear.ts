import type { EasingFunctionType } from '../types/index.ts';

/** Identity easing: progress advances at a constant rate. */
export const linear: EasingFunctionType = (t: number): number => { const result = t; return result; };
