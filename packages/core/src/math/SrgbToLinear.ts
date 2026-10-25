import { RgbEntity } from '../entities/RgbEntity.ts';

class SrgbToLinear {
  readonly 'name' = 'srgbToLinear';

  channel(value: number): number {
    if (value <= 0.04045) {
      const result = value / 12.92;
      return result;
    }
    const result = Math.pow((value + 0.055) / 1.055, 2.4);
    return result;
  }

  apply(r: number, g: number, b: number): RgbEntity.Type {
    const result = RgbEntity.create({
      'b': this.channel(b),
      'g': this.channel(g),
      'r': this.channel(r)
    });
    return result;
  }
}

/** Singleton instance registered as the `srgbToLinear` math primitive. */
export const srgbToLinear = new SrgbToLinear();
