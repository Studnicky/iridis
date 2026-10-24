import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ColorCoordinate } from '../../src/math/ColorCoordinate.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { gamutMapSrgb } from '../../src/math/GamutMapSrgb.ts';
import { oklchToRgbRaw } from '../../src/math/OklchToRgbRaw.ts';

class ColorCoordinateGrid {
  static readonly chromas = [0, 0.02, 0.1, 0.25, 0.5] as const;
  static readonly hues = ColorCoordinateGrid.hueValues();
  static readonly lightnesses = [-0.1, 0, 0.01, 0.25, 0.5, 0.75, 0.99, 1, 1.1] as const;

  private static hueValues(): readonly number[] {
    const hues: number[] = [];
    for (let index = 0; index <= 360; index += 10) {
      hues.push(index);
    }
    return hues;
  }

  static scenario(l: number, c: number, h: number): string {
    const result = `L=${l}, C=${c}, H=${h}`;
    return result;
  }
}

void test('ColorCoordinate preserves gamut mapping, RGB channels, and factory serialization across the deterministic OKLCH grid', () => {
  for (let lightnessIndex = 0; lightnessIndex < ColorCoordinateGrid.lightnesses.length; lightnessIndex += 1) {
    const l = ColorCoordinateGrid.lightnesses[lightnessIndex];
    if (l === undefined) {
      continue;
    }
    for (let chromaIndex = 0; chromaIndex < ColorCoordinateGrid.chromas.length; chromaIndex += 1) {
      const c = ColorCoordinateGrid.chromas[chromaIndex];
      if (c === undefined) {
        continue;
      }
      for (let hueIndex = 0; hueIndex < ColorCoordinateGrid.hues.length; hueIndex += 1) {
        const h = ColorCoordinateGrid.hues[hueIndex];
        if (h === undefined) {
          continue;
        }
        const coordinate = ColorCoordinate.fromOklch(l, c, h);
        const mapped = gamutMapSrgb.apply(l, c, h);
        const rgb = oklchToRgbRaw.apply(mapped.l, mapped.c, mapped.h);
        const record = colorRecordFactory.fromOklch(l, c, h);
        const coordinateRecord = colorRecordFactory.fromCoordinate(coordinate);
        const scenario = ColorCoordinateGrid.scenario(l, c, h);

        assert.ok(Object.is(coordinate.mappedL, mapped.l), `${scenario} mapped lightness`);
        assert.ok(Object.is(coordinate.mappedC, mapped.c), `${scenario} mapped chroma`);
        assert.ok(Object.is(coordinate.mappedH, mapped.h), `${scenario} mapped hue`);
        assert.ok(Object.is(coordinate.rgbR, rgb.r), `${scenario} red`);
        assert.ok(Object.is(coordinate.rgbG, rgb.g), `${scenario} green`);
        assert.ok(Object.is(coordinate.rgbB, rgb.b), `${scenario} blue`);
        assert.strictEqual(coordinate.requiresDisplayP3(), !mapped.inGamut, `${scenario} display P3 condition`);
        assert.ok(Object.is(record.rgb.r, coordinate.rgbR), `${scenario} factory red`);
        assert.ok(Object.is(record.rgb.g, coordinate.rgbG), `${scenario} factory green`);
        assert.ok(Object.is(record.rgb.b, coordinate.rgbB), `${scenario} factory blue`);
        assert.deepStrictEqual(coordinateRecord, record, `${scenario} factory coordinate serialization`);
      }
    }
  }
});


void test('ColorCoordinate bounds APCA magnitude across luminance intervals', () => {
  const foreground = ColorCoordinate.fromOklch(0.2, 0.1, 20);
  const background = ColorCoordinate.fromOklch(0.8, 0.1, 200);
  const bounds = ColorCoordinate.apcaMagnitudeBounds(
    Math.min(foreground.apcaLuminance, background.apcaLuminance),
    Math.max(foreground.apcaLuminance, background.apcaLuminance),
    Math.min(foreground.apcaLuminance, background.apcaLuminance),
    Math.max(foreground.apcaLuminance, background.apcaLuminance)
  );
  const actual = Math.abs(foreground.apca(background));
  assert.ok(actual >= bounds[0]);
  assert.ok(actual <= bounds[1]);
});

void test('ColorCoordinate preserves exact stored RGB for record-backed scoring', () => {
  const records = ['#000000', '#5e35b1', '#ffffff'];
  for (let index = 0; index < records.length; index += 1) {
    const hex = records[index];
    if (hex === undefined) {
      continue;
    }
    const record = colorRecordFactory.fromHex(hex);
    const coordinate = ColorCoordinate.fromRecord(record);
    assert.ok(Object.is(coordinate.rgbR, record.rgb.r), `${hex} red`);
    assert.ok(Object.is(coordinate.rgbG, record.rgb.g), `${hex} green`);
    assert.ok(Object.is(coordinate.rgbB, record.rgb.b), `${hex} blue`);
  }
});
