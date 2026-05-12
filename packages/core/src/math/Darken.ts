import type { ColorRecordInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class Darken {
  readonly 'name' = 'darken';

  apply(color: ColorRecordInterface, deltaL: number): ColorRecordInterface {
    const l = Math.max(0, Math.min(1, color.oklch.l - deltaL));
    return colorRecordFactory.fromOklch(l, color.oklch.c, color.oklch.h, color.alpha);
  }
}

/** Singleton instance registered as the `darken` math primitive. */
export const darken = new Darken();
