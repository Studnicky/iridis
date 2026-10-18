import type { ColorRecordInterfaceTypeEntity } from '../entities/ColorRecordInterfaceTypeEntity.ts';

import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

class HslComponents {
  static compute(h: number, s: number, l: number): [number, number, number] {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let components: [number, number, number];
    if (h < 60) {
      components = [c, x, 0];
    } else if (h < 120) {
      components = [x, c, 0];
    } else if (h < 180) {
      components = [0, c, x];
    } else if (h < 240) {
      components = [0, x, c];
    } else if (h < 300) {
      components = [x, 0, c];
    } else {
      components = [c, 0, x];
    }
    const [r, g, b] = components;
    const result: [number, number, number] = [r + m, g + m, b + m];
    return result;
  }
}

class HslToRgb {
  readonly 'name' = 'hslToRgb';

  apply(h: number, s: number, l: number, alpha = 1): ColorRecordInterfaceTypeEntity.Type {
    const [r, g, b] = HslComponents.compute(((h % 360) + 360) % 360, clamp01.apply(s), clamp01.apply(l));
    const result = colorRecordFactory.fromRgb(r, g, b, { 'alpha': alpha });
    return result;
  }
}

/** Singleton instance registered as the `hslToRgb` math primitive. */
export const hslToRgb = new HslToRgb();
