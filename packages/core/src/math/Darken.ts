import type { ColorRecordInterfaceType } from '../types/index.ts';

import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

class Darken {
  readonly 'name' = 'darken';

  apply(color: ColorRecordInterfaceType, deltaL: number): ColorRecordInterfaceType {
    const l = clamp01.apply(color.oklch.l - deltaL);
    return colorRecordFactory.fromOklch(l, color.oklch.c, color.oklch.h, { 'alpha': color.alpha });
  }
}

/** Singleton instance registered as the `darken` math primitive. */
export const darken = new Darken();
