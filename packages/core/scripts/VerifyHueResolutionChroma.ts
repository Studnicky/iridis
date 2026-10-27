import { hueResolutionChroma } from '../src/math/HueResolutionChroma.ts';
import { srgbToLinear } from '../src/math/SrgbToLinear.ts';

class EightBitSrgb {
  static chroma(red: number, green: number, blue: number): number {
    const linearRed = srgbToLinear.channel(red / 255);
    const linearGreen = srgbToLinear.channel(green / 255);
    const linearBlue = srgbToLinear.channel(blue / 255);
    const x = Math.cbrt(0.4122214708 * linearRed + 0.5363325363 * linearGreen + 0.0514459929 * linearBlue);
    const y = Math.cbrt(0.2119034982 * linearRed + 0.6806995451 * linearGreen + 0.1073969566 * linearBlue);
    const z = Math.cbrt(0.0883024619 * linearRed + 0.2817188376 * linearGreen + 0.6299787005 * linearBlue);
    const a = 1.9779984951 * x - 2.4285922050 * y + 0.4505937099 * z;
    const b = 0.0259040371 * x + 0.7827717662 * y - 0.8086757660 * z;
    return Math.sqrt(a * a + b * b);
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
