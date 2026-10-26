import assert from 'node:assert/strict';
import { test } from 'node:test';

import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { hueResolutionChroma } from '../../src/math/index.ts';

class HueResolutionChromaFixture {
  static nearestOffAxisChroma(): number {
    let minimum = Infinity;
    for (let level = 0; level <= 255; level += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        for (let directionIndex = 0; directionIndex < 2; directionIndex += 1) {
          const direction = directionIndex === 0 ? -1 : 1;
          const chroma = HueResolutionChromaFixture.neighborChroma(level, channel, direction);
          if (chroma !== undefined) {
            minimum = Math.min(minimum, chroma);
          }
        }
      }
    }
    return minimum;
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

void test('hueResolutionChroma is half the smallest off-axis sRGB chroma', () => {
  const nearestOffAxisChroma = HueResolutionChromaFixture.nearestOffAxisChroma();

  assert.equal(hueResolutionChroma, nearestOffAxisChroma / 2);
  assert.ok(hueResolutionChroma > 0);
});
