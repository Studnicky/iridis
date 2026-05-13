import type { ColorRecordInterface } from '../types/index.ts';
import { clamp01 } from './Clamp.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class Darken {
  readonly 'name' = 'darken';

  apply(color: ColorRecordInterface, deltaL: number): ColorRecordInterface {
    const l = clamp01(color.oklch.l - deltaL);
    return colorRecordFactory.fromOklch(l, color.oklch.c, color.oklch.h, color.alpha);
  }
}

/** Singleton instance registered as the `darken` math primitive. */
export const darken = new Darken();
