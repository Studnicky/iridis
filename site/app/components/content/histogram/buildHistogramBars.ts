import type { GalleryHistogramSlotInterfaceType } from '@studnicky/iridis-image/types';

class HistogramBar {
  public readonly h: number;
  public readonly hex: string;

  public constructor(height: number, hex: string) {
    this.h = height;
    this.hex = hex;
  }
}

export const buildHistogramBars = class HistogramBarsBuilder {
  public static build(
    bins: readonly GalleryHistogramSlotInterfaceType['bins'][number][]
  ): readonly HistogramBar[] {
    const sortedBins = [...bins].sort((left, right) => {
      return this.resolveHue(left.hex) - this.resolveHue(right.hex);
    });
    const greatestWeight = Math.max(1, ...sortedBins.map((bin) => {
      const result = bin.weight;
      return result;
    }));
    return sortedBins.map((bin) => {
      const height = Math.max(6, Math.round((bin.weight / greatestWeight) * 100));
      return new HistogramBar(height, bin.hex);
    });
  }

  private static resolveHue(hex: string): number {
    const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
    const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
    const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
    const greatestChannel = Math.max(red, green, blue);
    const leastChannel = Math.min(red, green, blue);
    const delta = greatestChannel - leastChannel;
    if (delta === 0) {
      return 0;
    }
    let value: number;
    if (greatestChannel === red) {
      value = ((green - blue) / delta) % 6;
    } else if (greatestChannel === green) {
      value = (blue - red) / delta + 2;
    } else {
      value = (red - green) / delta + 4;
    }
    value *= 60;
    return value < 0 ? value + 360 : value;
  }
};
