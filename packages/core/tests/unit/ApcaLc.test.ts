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
        void test(`apcaLc.apply matches the APCA-W3 0.1.9 reference: ${vector.label}`, ApcaLcSuite.lcCase(vector.text, vector.background, vector.expected));
      }
    }

    const luminances = APCA_REFERENCE_VECTORS.luminances;
    for (let index = 0; index < luminances.length; index++) {
      const vector = luminances[index];
      if (typeof vector !== 'undefined') {
        void test(`apcaLc.luminance matches reference sRGBtoY for 8-bit [${vector.channels.join(', ')}]`, ApcaLcSuite.luminanceCase(vector.channels, vector.expected));
      }
    }

    const framing = APCA_REFERENCE_VECTORS.darkFraming;
    for (let index = 0; index < framing.length; index++) {
      const vector = framing[index];
      if (typeof vector !== 'undefined') {
        void test(`apcaLc dark framing text [${vector.text.join(', ')}] on [${vector.background.join(', ')}] matches the reference`, ApcaLcSuite.framingCase(vector.text, vector.background, vector.expected));
      }
    }

    const rejected = APCA_REFERENCE_VECTORS.rejected;
    for (let index = 0; index < rejected.length; index++) {
      const pair = rejected[index];
      if (typeof pair !== 'undefined') {
        void test(`apcaLc.apply returns 0 for out-of-range input (${String(pair.text)}, ${String(pair.background)})`, ApcaLcSuite.rejectedCase(pair.text, pair.background));
      }
    }
  }

  static lcCase(text: number, background: number, expected: number): () => void {
    const result = (): void => {
      ApcaLcSuite.assertNear(apcaLc.apply(text, background), expected);
    };
    return result;
  }

  static luminanceCase(channels: readonly number[], expected: number): () => void {
    const result = (): void => {
      ApcaLcSuite.assertNear(ApcaLcSuite.unit(channels), expected);
    };
    return result;
  }

  static framingCase(text: readonly number[], background: readonly number[], expected: number): () => void {
    const result = (): void => {
      ApcaLcSuite.assertNear(apcaLc.apply(ApcaLcSuite.unit(text), ApcaLcSuite.unit(background)), expected);
    };
    return result;
  }

  static rejectedCase(text: number, background: number): () => void {
    const result = (): void => {
      assert.equal(apcaLc.apply(text, background), 0);
    };
    return result;
  }

  static assertNear(actual: number, expected: number): void {
    assert.ok(
      Math.abs(actual - expected) < APCA_REFERENCE_VECTORS.tolerance,
      `expected ${String(expected)}, got ${String(actual)}`
    );
  }

  static unit(channels: readonly number[]): number {
    const [red = 0, green = 0, blue = 0] = channels;
    const eightBit = 255;
    const result = apcaLc.luminance(red / eightBit, green / eightBit, blue / eightBit);
    return result;
  }
}

ApcaLcSuite.register();
