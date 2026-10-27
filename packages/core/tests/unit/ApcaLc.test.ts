import assert from 'node:assert/strict';
import { test } from 'node:test';

import { apcaLc } from '../../src/math/ApcaLc.ts';
import { APCA_REFERENCE_VECTORS } from './fixtures/ApcaReferenceVectors.ts';

class ApcaLcSuite {
  static register(): void {
    const vectors = APCA_REFERENCE_VECTORS.vectors;
    for (let index = 0; index < vectors.length; index++) {
      const vector = vectors[index];
      if (typeof vector !== 'undefined') {
        void test(`apcaLc.apply matches the APCA-W3 0.1.9 reference: ${vector.label}`, () => {
          ApcaLcSuite.assertVector(vector.text, vector.background, vector.expected);
        });
      }
    }
  }

  static assertVector(text: number, background: number, expected: number): void {
    const result = apcaLc.apply(text, background);
    assert.ok(
      Math.abs(result - expected) < APCA_REFERENCE_VECTORS.tolerance,
      `expected ${String(expected)}, got ${String(result)}`
    );
  }
}

ApcaLcSuite.register();

void test('apcaLc.luminance linearises low channels with the piecewise sRGB segment, unlike the reference pure 2.4 power', () => {
  const channel = 0.02;
  const luminance = apcaLc.luminance(channel, channel, channel);
  const coefficientSum = apcaLc.luminance(1, 1, 1);
  const referenceLuminance = coefficientSum * (channel ** 2.4);

  assert.ok(Math.abs(luminance - (coefficientSum * channel) / 12.92) < APCA_REFERENCE_VECTORS.tolerance);
  assert.ok(luminance > referenceLuminance, 'piecewise Y exceeds pure-power Y for dark channels');
});

void test('apcaLc.luminance of white is the sum of the reference sRGB coefficients', () => {
  const white = apcaLc.luminance(1, 1, 1);
  assert.ok(Math.abs(white - 1.0000001) < APCA_REFERENCE_VECTORS.tolerance);
});
