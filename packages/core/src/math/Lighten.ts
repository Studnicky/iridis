import type { ColorRecordInterfaceType } from '../types/index.ts';

import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

class Lighten {
  readonly 'name' = 'lighten';

  apply(color: ColorRecordInterfaceType, deltaL: number): ColorRecordInterfaceType {
    const l = clamp01.apply(color.oklch.l + deltaL);
    return colorRecordFactory.fromOklch(l, color.oklch.c, color.oklch.h, { 'alpha': color.alpha });
  }
}

/** Singleton instance registered as the `lighten` math primitive. */
export const lighten = new Lighten();
