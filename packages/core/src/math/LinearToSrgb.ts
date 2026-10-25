import { RgbEntity } from '../entities/RgbEntity.ts';

class LinearToSrgb {
  readonly 'name' = 'linearToSrgb';

  channel(value: number): number {
    if (value <= 0.0031308) {
      const result = 12.92 * value;
      return result;
    }
    const result = 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
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

/** Singleton instance registered as the `linearToSrgb` math primitive. */
export const linearToSrgb = new LinearToSrgb();
