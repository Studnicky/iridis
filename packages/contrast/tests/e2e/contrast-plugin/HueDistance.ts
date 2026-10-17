/** Circular hue distance helper for CVD correction assertions. */
export class HueDistance {
  static between(first: number, second: number): number {
    const distance = Math.abs(first - second) % 360;
    const result = Math.min(distance, 360 - distance);
    return result;
  }
}
