import type { ColorRecordInterface } from '../types/index.ts';
import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class Lighten {
  readonly 'name' = 'lighten';

  apply(color: ColorRecordInterface, deltaL: number): ColorRecordInterface {
    const l = clamp01.apply(color.oklch.l + deltaL);
    return colorRecordFactory.fromOklch(l, color.oklch.c, color.oklch.h, color.alpha);
  }
}

/** Singleton instance registered as the `lighten` math primitive. */
export const lighten = new Lighten();
