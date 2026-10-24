import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { apcaLc } from './ApcaLc.ts';
import { deltaE2000 } from './DeltaE2000.ts';
import { gamutMapSrgb } from './GamutMapSrgb.ts';
import { luminance } from './Luminance.ts';
import { oklchToRgbRaw } from './OklchToRgbRaw.ts';

/** Internal numeric representation shared by record construction and contrast scoring. */
export class ColorCoordinate {
  readonly 'apcaLuminance': number;
  readonly 'c': number;
  readonly 'h': number;
  readonly 'l': number;
  readonly 'mappedC': number;
  readonly 'mappedH': number;
  readonly 'mappedL': number;
  readonly 'relativeLuminance': number;
  readonly 'rgbB': number;
  readonly 'rgbG': number;
  readonly 'rgbR': number;

  private constructor(
    l: number,
    c: number,
    h: number,
    mappedL: number,
    mappedC: number,
    mappedH: number,
    rgbR: number,
    rgbG: number,
    rgbB: number
  ) {
    this.apcaLuminance = apcaLc.luminance(rgbR, rgbG, rgbB);
    this.c = c;
    this.h = h;
    this.l = l;
    this.mappedC = mappedC;
    this.mappedH = mappedH;
    this.mappedL = mappedL;
    this.relativeLuminance = luminance.rgb(rgbR, rgbG, rgbB);
    this.rgbB = rgbB;
    this.rgbG = rgbG;
    this.rgbR = rgbR;
  }

  /** Conservative APCA-magnitude envelope for independent foreground and background luminance intervals. */
  static apcaMagnitudeBounds(
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
    const crossesPolarity =
      foregroundMinimum <= backgroundMaximum &&
      foregroundMaximum >= backgroundMinimum;
    const minimum = crossesPolarity ? 0 : Math.min(...candidates);
    const result: readonly [number, number] = [minimum, Math.max(...candidates)];
    return result;
  }

  static fromRecord(record: ColorRecordEntity.Type): ColorCoordinate {
    const result = new ColorCoordinate(
      record.oklch.l,
      record.oklch.c,
      record.oklch.h,
      record.oklch.l,
      record.oklch.c,
      record.oklch.h,
      record.rgb.r,
      record.rgb.g,
      record.rgb.b
    );
    return result;
  }

  static fromOklch(l: number, c: number, h: number): ColorCoordinate {
    const mapped = gamutMapSrgb.apply(l, c, h);
    const rgb = oklchToRgbRaw.coordinates(mapped.l, mapped.c, mapped.h);
    const result = new ColorCoordinate(
      l,
      c,
      h,
      mapped.l,
      mapped.c,
      mapped.h,
      rgb.r,
      rgb.g,
      rgb.b
    );
    return result;
  }

  /** Preserves the source-format raw sRGB conversion for internal numeric searches. */
  static fromRawOklch(l: number, c: number, h: number): ColorCoordinate {
    const rgb = oklchToRgbRaw.coordinates(l, c, h);
    const result = new ColorCoordinate(l, c, h, l, c, h, rgb.r, rgb.g, rgb.b);
    return result;
  }

  apca(other: ColorCoordinate): number {
    const result = apcaLc.apply(this.apcaLuminance, other.apcaLuminance);
    return result;
  }

  deltaE2000(other: ColorCoordinate): number {
    const result = deltaE2000.coordinates(
      { 'c': this.c, 'h': this.h, 'l': this.l },
      { 'c': other.c, 'h': other.h, 'l': other.l }
    );
    return result;
  }

  requiresDisplayP3(): boolean {
    const result = this.l !== this.mappedL || this.c !== this.mappedC;
    return result;
  }

  wcag21(other: ColorCoordinate): number {
    const lighter = Math.max(this.relativeLuminance, other.relativeLuminance);
    const darker = Math.min(this.relativeLuminance, other.relativeLuminance);
    const result = (lighter + 0.05) / (darker + 0.05);
    return result;
  }
}
