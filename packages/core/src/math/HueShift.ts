import type { ColorRecordInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class HueShift {
  readonly 'name' = 'hueShift';

  apply(color: ColorRecordInterface, degrees: number): ColorRecordInterface {
    const h = ((color.oklch.h + degrees) % 360 + 360) % 360;
    return colorRecordFactory.fromOklch(color.oklch.l, color.oklch.c, h, color.alpha);
  }
}

/** Singleton instance registered as the `hueShift` math primitive. */
export const hueShift = new HueShift();
