import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ColorCoordinate } from '../../src/math/ColorCoordinate.ts';
import { HueIntervalBounds } from '../../src/math/HueIntervalBounds.ts';

class HueIntervalBoundsFixture {
  public static verify(lightness: number, chroma: number, startHue: number, endHue: number): void {
    const bounds = HueIntervalBounds.fixedArc(lightness, chroma, startHue, endHue);
    for (let hue = startHue; hue <= endHue; hue += 0.25) {
      const coordinate = ColorCoordinate.fromOklch(lightness, chroma, hue);
      assert.ok(coordinate.relativeLuminance >= bounds.minimumRelativeLuminance, `relative lower H=${hue}`);
      assert.ok(coordinate.relativeLuminance <= bounds.maximumRelativeLuminance, `relative upper H=${hue}`);
      assert.ok(coordinate.apcaLuminance >= bounds.minimumApcaLuminance, `APCA lower H=${hue}`);
      assert.ok(coordinate.apcaLuminance <= bounds.maximumApcaLuminance, `APCA upper H=${hue}`);
    }
  }
}

void test('HueIntervalBounds contains gamut-mapped luminance throughout deterministic hue arcs', () => {
  const cases: readonly (readonly [number, number, number, number])[] = [
    [0, 0, 0, 360],
    [0.1, 0.5, 0, 90],
    [0.25, 0.4, 90, 180],
    [0.5, 0.5, 180, 270],
    [0.75, 0.4, 270, 360],
    [1, 0.5, 0, 360]
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const scenario = cases[index];
    if (scenario === undefined) {
      throw new RangeError(`Hue interval fixture is missing scenario ${index}`);
    }
    HueIntervalBoundsFixture.verify(scenario[0], scenario[1], scenario[2], scenario[3]);
  }
});

void test('HueIntervalBounds rejects wrapping arcs so callers split at the hue boundary', () => {
  assert.throws(() => { HueIntervalBounds.fixedArc(0.5, 0.2, 350, 10); });
});
