import type { ColorRecordInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class Desaturate {
  readonly 'name' = 'desaturate';

  apply(color: ColorRecordInterface, deltaC: number): ColorRecordInterface {
    const c = Math.max(0, Math.min(0.5, color.oklch.c - deltaC));
    return colorRecordFactory.fromOklch(color.oklch.l, c, color.oklch.h, color.alpha);
  }
}

export const desaturate = new Desaturate();
