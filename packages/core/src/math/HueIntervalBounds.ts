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

/** Conservative sRGB luminance bounds for a fixed OKLCH L/C hue arc after the engine gamut map. */
export class HueIntervalBounds {
  public readonly maximumApcaLuminance: number;
  public readonly maximumRelativeLuminance: number;
  public readonly minimumApcaLuminance: number;
  public readonly minimumRelativeLuminance: number;

  private constructor(red: NumericInterval, green: NumericInterval, blue: NumericInterval) {
    const redLinear = HueIntervalBounds.linear(red);
    const greenLinear = HueIntervalBounds.linear(green);
    const blueLinear = HueIntervalBounds.linear(blue);
    this.minimumRelativeLuminance = 0.2126 * redLinear.minimum + 0.7152 * greenLinear.minimum + 0.0722 * blueLinear.minimum;
    this.maximumRelativeLuminance = 0.2126 * redLinear.maximum + 0.7152 * greenLinear.maximum + 0.0722 * blueLinear.maximum;
    this.minimumApcaLuminance = 0.2126729 * redLinear.minimum + 0.7151522 * greenLinear.minimum + 0.072175 * blueLinear.minimum;
    this.maximumApcaLuminance = 0.2126729 * redLinear.maximum + 0.7151522 * greenLinear.maximum + 0.072175 * blueLinear.maximum;
  }

  public static fixedArc(lightness: number, chroma: number, startHue: number, endHue: number): HueIntervalBounds {
    if (!Number.isFinite(lightness) || !Number.isFinite(chroma) || !Number.isFinite(startHue) || !Number.isFinite(endHue)) {
      throw new TypeError('Hue interval requires finite OKLCH coordinates');
    }
    if (chroma < 0) {
      throw new RangeError('Hue interval requires non-negative chroma');
    }
    if (startHue < 0 || endHue > 360 || startHue > endHue) {
      throw new RangeError('Hue interval must be non-wrapping and within 0–360 degrees');
    }
    const l = NumericInterval.point(lightness);
    const c = new NumericInterval(0, chroma);
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

  private static linear(linearSrgb: NumericInterval): NumericInterval {
    const minimumEncoded = Math.max(0, Math.min(1, linearToSrgb.channel(linearSrgb.minimum)));
    const maximumEncoded = Math.max(0, Math.min(1, linearToSrgb.channel(linearSrgb.maximum)));
    const result = new NumericInterval(
      srgbToLinear.channel(minimumEncoded),
      srgbToLinear.channel(maximumEncoded)
    );
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
