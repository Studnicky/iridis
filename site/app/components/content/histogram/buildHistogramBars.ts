import type { GalleryHistogramSlotInterfaceType } from '@studnicky/iridis-image/types';

export type HistogramBarType = {
  h: number;
  hex: string;
};

function hue(hex: string): number {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta === 0) {
    return 0;
  }
  let value = max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  value *= 60;
  return value < 0 ? value + 360 : value;
}

export function buildHistogramBars(
  bins: readonly GalleryHistogramSlotInterfaceType['bins'][number][]
): HistogramBarType[] {
  const sortedBins = [...bins].sort((left, right) => hue(left.hex) - hue(right.hex));
  const maxWeight = Math.max(1, ...sortedBins.map((bin) => bin.weight));
  return sortedBins.map((bin) => ({
    h: Math.max(6, Math.round((bin.weight / maxWeight) * 100)),
    hex: bin.hex
  }));
}
