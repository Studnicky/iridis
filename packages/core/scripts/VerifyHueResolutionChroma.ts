import { hueResolutionChroma } from '../src/math/HueResolutionChroma.ts';
import { colorRecordFactory } from '../src/math/ColorRecordFactory.ts';

class EightBitSrgb {
  static chroma(red: number, green: number, blue: number): number {
    const result = colorRecordFactory.fromRgb(red / 255, green / 255, blue / 255).oklch.c;
    return result;
  }

  static minimumNonGreyChroma(): number {
    let minimum = Infinity;
    for (let red = 0; red <= 255; red += 1) {
      for (let green = 0; green <= 255; green += 1) {
        for (let blue = 0; blue <= 255; blue += 1) {
          if (red === green && green === blue) continue;
          minimum = Math.min(minimum, EightBitSrgb.chroma(red, green, blue));
        }
      }
    }
    return minimum;
  }
}

const minimum = EightBitSrgb.minimumNonGreyChroma();
if (minimum !== hueResolutionChroma * 2) {
  throw new Error('The minimum non-grey chroma does not match the exported threshold.');
}
console.log(JSON.stringify({ 'hueResolutionChroma': hueResolutionChroma, 'minimumNonGreyChroma': minimum }));
