import type { ColorRecordInterfaceType } from '../types/index.ts';

import { clamp } from './Clamp.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

class Saturate {
  readonly 'name' = 'saturate';

  apply(color: ColorRecordInterfaceType, deltaC: number): ColorRecordInterfaceType {
    const c = clamp.apply(0, 0.5, color.oklch.c + deltaC);
    return colorRecordFactory.fromOklch(color.oklch.l, c, color.oklch.h, { 'alpha': color.alpha });
  }
}

/** Singleton instance registered as the `saturate` math primitive. */
export const saturate = new Saturate();
