import { apcaLc } from './ApcaLc.ts';
import { linearToSrgb } from './LinearToSrgb.ts';
import { srgbToLinear } from './SrgbToLinear.ts';

class NumericInterval {
  public readonly maximum: number;
  public readonly minimum: number;

  public constructor(minimum: number, maximum: number) {
    this.minimum = NumericInterval.down(minimum);
    this.maximum = NumericInterval.up(maximum);
  }

  public static point(value: number): NumericInterval {
    const result = new NumericInterval(value, value);
    return result;
  }

  public add(other: NumericInterval): NumericInterval {
    const result = new NumericInterval(this.minimum + other.minimum, this.maximum + other.maximum);
    return result;
  }

  public cube(): NumericInterval {
    const result = new NumericInterval(this.minimum * this.minimum * this.minimum, this.maximum * this.maximum * this.maximum);
    return result;
  }

  public multiply(other: NumericInterval): NumericInterval {
    const values = [
      this.minimum * other.minimum,
      this.minimum * other.maximum,
      this.maximum * other.minimum,
      this.maximum * other.maximum
    ];
    const result = new NumericInterval(Math.min(...values), Math.max(...values));
    return result;
  }

  public scale(value: number): NumericInterval {
    const result = value >= 0
      ? new NumericInterval(this.minimum * value, this.maximum * value)
      : new NumericInterval(this.maximum * value, this.minimum * value);
    return result;
  }

  private static down(value: number): number {
    const epsilon = (Math.abs(value) + 1) * Number.EPSILON * 64;
    const result = value - epsilon;
    return result;
  }

  private static up(value: number): number {
    const epsilon = (Math.abs(value) + 1) * Number.EPSILON * 64;
    const result = value + epsilon;
    return result;
  }
}

/**
 * The gamut map preserves lightness and only reduces chroma before clipping, so emitted colors lie in the clipped L/[0,Cmax] envelope.
 * Outward-rounded interval operations conservatively contain its sRGB luminance and APCA luminance.
 */
export class HueIntervalBounds {
  public readonly maximumApcaLuminance: number;
  public readonly maximumRelativeLuminance: number;
  public readonly minimumApcaLuminance: number;
  public readonly minimumRelativeLuminance: number;

  private constructor(red: NumericInterval, green: NumericInterval, blue: NumericInterval) {
    const redEncoded = HueIntervalBounds.encoded(red);
    const greenEncoded = HueIntervalBounds.encoded(green);
    const blueEncoded = HueIntervalBounds.encoded(blue);
    const redLinear = HueIntervalBounds.mapped(redEncoded, srgbToLinear);
    const greenLinear = HueIntervalBounds.mapped(greenEncoded, srgbToLinear);
    const blueLinear = HueIntervalBounds.mapped(blueEncoded, srgbToLinear);
    const redApca = HueIntervalBounds.mapped(redEncoded, apcaLc);
    const greenApca = HueIntervalBounds.mapped(greenEncoded, apcaLc);
    const blueApca = HueIntervalBounds.mapped(blueEncoded, apcaLc);
    this.minimumRelativeLuminance = 0.2126 * redLinear.minimum + 0.7152 * greenLinear.minimum + 0.0722 * blueLinear.minimum;
    this.maximumRelativeLuminance = 0.2126 * redLinear.maximum + 0.7152 * greenLinear.maximum + 0.0722 * blueLinear.maximum;
    this.minimumApcaLuminance = 0.2126729 * redApca.minimum + 0.7151522 * greenApca.minimum + 0.072175 * blueApca.minimum;
    this.maximumApcaLuminance = 0.2126729 * redApca.maximum + 0.7151522 * greenApca.maximum + 0.072175 * blueApca.maximum;
  }

  public static apcaMagnitudeBounds(
    foregroundMinimum: number,
    foregroundMaximum: number,
    backgroundMinimum: number,
    backgroundMaximum: number
  ): readonly [number, number] {
    const candidates = [
      Math.abs(apcaLc.apply(foregroundMinimum, backgroundMinimum)),
      Math.abs(apcaLc.apply(foregroundMinimum, backgroundMaximum)),
      Math.abs(apcaLc.apply(foregroundMaximum, backgroundMinimum)),
      Math.abs(apcaLc.apply(foregroundMaximum, backgroundMaximum))
    ];
    const overlaps =
      foregroundMinimum <= backgroundMaximum &&
      foregroundMaximum >= backgroundMinimum;
    const minimum = overlaps ? 0 : Math.min(...candidates);
    return [minimum, Math.max(...candidates)];
  }

  public static fixedArc(lightness: number, chroma: number, startHue: number, endHue: number): HueIntervalBounds {
    const result = HueIntervalBounds.range([lightness, lightness], [chroma, chroma], startHue, endHue);
    return result;
  }

  public static range(
    lightnessRange: readonly [number, number],
    chromaRange: readonly [number, number],
    startHue: number,
    endHue: number
  ): HueIntervalBounds {
    const [minimumLightness, maximumLightness] = lightnessRange;
    const [minimumChroma, maximumChroma] = chromaRange;
    if (
      !Number.isFinite(minimumLightness) ||
      !Number.isFinite(maximumLightness) ||
      !Number.isFinite(minimumChroma) ||
      !Number.isFinite(maximumChroma) ||
      !Number.isFinite(startHue) ||
      !Number.isFinite(endHue)
    ) {
      throw new TypeError('Hue interval requires finite OKLCH coordinates');
    }
    if (minimumLightness > maximumLightness || minimumChroma < 0 || minimumChroma > maximumChroma) {
      throw new RangeError('Hue interval requires ordered non-negative OKLCH ranges');
    }
    if (startHue < 0 || endHue > 360 || startHue > endHue) {
      throw new RangeError('Hue interval must be non-wrapping and within 0–360 degrees');
    }
    const l = new NumericInterval(minimumLightness, maximumLightness);
    const c = new NumericInterval(0, maximumChroma);
    const radians = new NumericInterval((startHue * Math.PI) / 180, (endHue * Math.PI) / 180);
    const a = c.multiply(HueIntervalBounds.cosine(radians));
    const b = c.multiply(HueIntervalBounds.sine(radians));
    const x = l.add(a.scale(0.3963377774)).add(b.scale(0.2158037573)).cube();
    const y = l.add(a.scale(-0.1055613458)).add(b.scale(-0.0638541728)).cube();
    const z = l.add(a.scale(-0.0894841775)).add(b.scale(-1.291485548)).cube();
    const red = x.scale(4.0767416621).add(y.scale(-3.3077115913)).add(z.scale(0.2309699292));
    const green = x.scale(-1.2684380046).add(y.scale(2.6097574011)).add(z.scale(-0.3413193965));
    const blue = x.scale(-0.0041960863).add(y.scale(-0.7034186147)).add(z.scale(1.707614701));
    const result = new HueIntervalBounds(red, green, blue);
    return result;
  }

  private static cosine(radians: NumericInterval): NumericInterval {
    const values = HueIntervalBounds.trigonometricValues(radians, Math.cos, [0, Math.PI, Math.PI * 2]);
    const result = new NumericInterval(Math.min(...values), Math.max(...values));
    return result;
  }

  private static encoded(linearSrgb: NumericInterval): NumericInterval {
    const minimumEncoded = Math.max(0, Math.min(1, linearToSrgb.channel(linearSrgb.minimum)));
    const maximumEncoded = Math.max(0, Math.min(1, linearToSrgb.channel(linearSrgb.maximum)));
    const result = new NumericInterval(minimumEncoded, maximumEncoded);
    return result;
  }

  private static mapped(encoded: NumericInterval, curve: { channel(value: number): number }): NumericInterval {
    const result = new NumericInterval(curve.channel(encoded.minimum), curve.channel(encoded.maximum));
    return result;
  }

  private static sine(radians: NumericInterval): NumericInterval {
    const values = HueIntervalBounds.trigonometricValues(radians, Math.sin, [Math.PI / 2, (Math.PI * 3) / 2]);
    const result = new NumericInterval(Math.min(...values), Math.max(...values));
    return result;
  }

  private static trigonometricValues(
    radians: NumericInterval,
    operation: (value: number) => number,
    critical: readonly number[]
  ): number[] {
    const values = [operation(radians.minimum), operation(radians.maximum)];
    for (let index = 0; index < critical.length; index += 1) {
      const candidate = critical[index];
      if (candidate !== undefined && candidate >= radians.minimum && candidate <= radians.maximum) {
        values.push(operation(candidate));
      }
    }
    return values;
  }
}
