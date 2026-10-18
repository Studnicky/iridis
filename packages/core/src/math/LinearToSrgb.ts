import { RgbInterfaceTypeEntity } from '../entities/RgbInterfaceTypeEntity.ts';

class GammaEncode {
  static channel(v: number): number {
    if (v <= 0.0031308) {
      const result = 12.92 * v;
      return result;
    }
    const result = 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return result;
  }
}

class LinearToSrgb {
  readonly 'name' = 'linearToSrgb';

  apply(r: number, g: number, b: number): RgbInterfaceTypeEntity.Type {
    const result = RgbInterfaceTypeEntity.create({
      'b': GammaEncode.channel(b),
      'g': GammaEncode.channel(g),
      'r': GammaEncode.channel(r)
    });
    return result;
  }
}

/** Singleton instance registered as the `linearToSrgb` math primitive. */
export const linearToSrgb = new LinearToSrgb();
