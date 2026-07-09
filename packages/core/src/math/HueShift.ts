import type { ColorRecordInterfaceType } from '../types/index.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';

class HueShift {
  readonly 'name' = 'hueShift';

  apply(color: ColorRecordInterfaceType, degrees: number): ColorRecordInterfaceType {
    const h = ((color.oklch.h + degrees) % 360 + 360) % 360;
    return colorRecordFactory.fromOklch(color.oklch.l, color.oklch.c, h, { 'alpha': color.alpha });
  }
}

/** Singleton instance registered as the `hueShift` math primitive. */
export const hueShift = new HueShift();
