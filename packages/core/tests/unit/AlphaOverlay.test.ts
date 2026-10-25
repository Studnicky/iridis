import assert from 'node:assert/strict';
import { test } from 'node:test';

import { alphaOverlay } from '../../src/math/AlphaOverlay.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { linearToSrgb } from '../../src/math/LinearToSrgb.ts';

class AlphaOverlayAssertion {
  static approximatelyEqual(actual: number, expected: number): void {
    assert.ok(Math.abs(actual - expected) < 1e-12, `expected ${expected}, received ${actual}`);
  }
}

void test('alpha overlay replaces an opaque base with an opaque overlay', () => {
  const result = alphaOverlay.apply(
    colorRecordFactory.fromHex('#000000'),
    colorRecordFactory.fromHex('#ffffff'),
    1
  );

  assert.equal(result.alpha, 1);
  assert.equal(result.hex, '#ffffff');
});

void test('alpha overlay preserves the base at zero relationship alpha', () => {
  const base = colorRecordFactory.fromHex('#33669980');
  const result = alphaOverlay.apply(base, colorRecordFactory.fromHex('#ff0000'), 0);

  AlphaOverlayAssertion.approximatelyEqual(result.alpha, base.alpha);
  AlphaOverlayAssertion.approximatelyEqual(result.rgb.r, base.rgb.r);
  AlphaOverlayAssertion.approximatelyEqual(result.rgb.g, base.rgb.g);
  AlphaOverlayAssertion.approximatelyEqual(result.rgb.b, base.rgb.b);
});

void test('alpha overlay composites translucent records in linear sRGB', () => {
  const result = alphaOverlay.apply(
    colorRecordFactory.fromHex('#00000080'),
    colorRecordFactory.fromHex('#ffffff80'),
    0.5
  );
  const overlayAlpha = 0.5 * (0x80 / 255);
  const baseAlpha = 0x80 / 255;
  const expectedAlpha = overlayAlpha + baseAlpha * (1 - overlayAlpha);
  const expectedChannel = linearToSrgb.channel(overlayAlpha / expectedAlpha);

  AlphaOverlayAssertion.approximatelyEqual(result.alpha, expectedAlpha);
  AlphaOverlayAssertion.approximatelyEqual(result.rgb.r, expectedChannel);
  AlphaOverlayAssertion.approximatelyEqual(result.rgb.g, expectedChannel);
  AlphaOverlayAssertion.approximatelyEqual(result.rgb.b, expectedChannel);
});

void test('alpha overlay clamps relationship opacity and returns a bounded alpha', () => {
  const result = alphaOverlay.apply(
    colorRecordFactory.fromHex('#00000000'),
    colorRecordFactory.fromHex('#ffffff80'),
    2
  );

  AlphaOverlayAssertion.approximatelyEqual(result.alpha, 0x80 / 255);
  assert.ok(result.alpha >= 0 && result.alpha <= 1);
});
