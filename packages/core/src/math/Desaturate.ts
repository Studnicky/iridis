import type { ColorRecordInterfaceType } from '../types/index.ts';

import { clamp } from './Clamp.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

class Desaturate {
  readonly 'name' = 'desaturate';

  apply(color: ColorRecordInterfaceType, deltaC: number): ColorRecordInterfaceType {
    const c = clamp.apply(0, 0.5, color.oklch.c - deltaC);
    return colorRecordFactory.fromOklch(color.oklch.l, c, color.oklch.h, { 'alpha': color.alpha });
  }
}

/** Singleton instance registered as the `desaturate` math primitive. */
export const desaturate = new Desaturate();
