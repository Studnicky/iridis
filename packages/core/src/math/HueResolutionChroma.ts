import { colorRecordFactory } from './ColorRecordFactory.ts';

class HueResolutionChroma {
  static calculate(): number {
    let minimum = Infinity;
    for (let level = 0; level <= 255; level += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        for (let directionIndex = 0; directionIndex < 2; directionIndex += 1) {
          const direction = directionIndex === 0 ? -1 : 1;
          const chroma = HueResolutionChroma.neighborChroma(level, channel, direction);
          if (chroma !== undefined) {
            minimum = Math.min(minimum, chroma);
          }
        }
      }
    }
    const result = minimum / 2;
    return result;
  }

  private static neighborChroma(level: number, channel: number, direction: number): number | undefined {
    const neighbor = level + direction;
    if (neighbor < 0 || neighbor > 255) {
      return undefined;
    }
    const red = channel === 0 ? neighbor : level;
    const green = channel === 1 ? neighbor : level;
    const blue = channel === 2 ? neighbor : level;
    const result = colorRecordFactory.fromRgb(red / 255, green / 255, blue / 255).oklch.c;
    return result;
  }
}

export const hueResolutionChroma = HueResolutionChroma.calculate();
