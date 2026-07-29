import { oklchToRgb, rgbToHex } from '@studnicky/iridis/math';

/** OKLCH -> hex, composed from the two core math primitives (no intermediate rounding beyond rgbToHex's own byte clamp). */
class OklchToHexOperation {
  static run(l: number, c: number, h: number): string {
    const rgb = oklchToRgb.apply(l, c, h).rgb;
    return rgbToHex.apply(rgb.r, rgb.g, rgb.b);
  }
}

export const oklchToHex = OklchToHexOperation.run;
