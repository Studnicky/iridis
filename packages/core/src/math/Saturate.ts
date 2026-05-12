import type { ColorRecordInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class Saturate {
  readonly 'name' = 'saturate';

  apply(color: ColorRecordInterface, deltaC: number): ColorRecordInterface {
    const c = Math.max(0, Math.min(0.5, color.oklch.c + deltaC));
    return colorRecordFactory.fromOklch(color.oklch.l, c, color.oklch.h, color.alpha);
  }
}

/** Singleton instance registered as the `saturate` math primitive. */
export const saturate = new Saturate();
