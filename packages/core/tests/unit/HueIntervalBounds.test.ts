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

  public static verifyRange(
    lightness: readonly [number, number],
    chroma: readonly [number, number],
    startHue: number,
    endHue: number
  ): void {
    const bounds = HueIntervalBounds.range(lightness, chroma, startHue, endHue);
    for (let hue = startHue; hue <= endHue; hue += 1) {
      for (let lightnessIndex = 0; lightnessIndex <= 4; lightnessIndex += 1) {
        const candidateLightness = lightness[0] + ((lightness[1] - lightness[0]) * lightnessIndex) / 4;
        for (let chromaIndex = 0; chromaIndex <= 4; chromaIndex += 1) {
          const candidateChroma = chroma[0] + ((chroma[1] - chroma[0]) * chromaIndex) / 4;
          const coordinate = ColorCoordinate.fromOklch(candidateLightness, candidateChroma, hue);
          assert.ok(coordinate.relativeLuminance >= bounds.minimumRelativeLuminance, `range relative lower H=${hue}`);
          assert.ok(coordinate.relativeLuminance <= bounds.maximumRelativeLuminance, `range relative upper H=${hue}`);
          assert.ok(coordinate.apcaLuminance >= bounds.minimumApcaLuminance, `range APCA lower H=${hue}`);
          assert.ok(coordinate.apcaLuminance <= bounds.maximumApcaLuminance, `range APCA upper H=${hue}`);
        }
      }
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

void test('HueIntervalBounds contains deterministic randomized and split wrap-around arcs', () => {
  let state = 0x6d2b79f5;
  const next = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    const result = state / 0x1_0000_0000;
    return result;
  };
  for (let index = 0; index < 64; index += 1) {
    const lightness = next();
    const chroma = next() * 0.5;
    const start = next() * 360;
    const span = 5 + next() * 355;
    const end = start + span;
    if (end <= 360) {
      HueIntervalBoundsFixture.verify(lightness, chroma, start, end);
      continue;
    }
    HueIntervalBoundsFixture.verify(lightness, chroma, start, 360);
    HueIntervalBoundsFixture.verify(lightness, chroma, 0, end - 360);
  }
});

void test('HueIntervalBounds contains sampled lightness and chroma envelopes', () => {
  HueIntervalBoundsFixture.verifyRange([0.15, 0.85], [0.05, 0.35], 45, 135);
  HueIntervalBoundsFixture.verifyRange([0.4, 0.95], [0, 0.5], 180, 360);
});

void test('HueIntervalBounds rejects wrapping arcs so callers split at the hue boundary', () => {
  assert.throws(() => { HueIntervalBounds.fixedArc(0.5, 0.2, 350, 10); });
});
