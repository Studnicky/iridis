import type { ColorRecordInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class Lighten {
  readonly 'name' = 'lighten';

  apply(color: ColorRecordInterface, deltaL: number): ColorRecordInterface {
    const l = Math.max(0, Math.min(1, color.oklch.l + deltaL));
    return colorRecordFactory.fromOklch(l, color.oklch.c, color.oklch.h, color.alpha);
  }
}

/** Singleton instance registered as the `lighten` math primitive. */
export const lighten = new Lighten();
