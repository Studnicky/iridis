import { RgbEntity } from '../entities/RgbEntity.ts';

class GammaDecode {
  static channel(v: number): number {
    if (v <= 0.04045) {
      const result = v / 12.92;
      return result;
    }
    const result = Math.pow((v + 0.055) / 1.055, 2.4);
    return result;
  }
}

class SrgbToLinear {
  readonly 'name' = 'srgbToLinear';

  apply(r: number, g: number, b: number): RgbEntity.Type {
    const result = RgbEntity.create({
      'b': GammaDecode.channel(b),
      'g': GammaDecode.channel(g),
      'r': GammaDecode.channel(r)
    });
    return result;
  }
}

/** Singleton instance registered as the `srgbToLinear` math primitive. */
export const srgbToLinear = new SrgbToLinear();
