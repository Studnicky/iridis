import { test }                           from 'node:test';
import assert                             from 'node:assert/strict';
import {
  clusterMedianCut,
  contrastWcag21,
  darken,
  hexToRgb,
  lighten,
  oklchToRgb,
  rgbToOklch,
} from '@studnicky/iridis/math';
import type { ColorRecordInterface } from '@studnicky/iridis/model';

// ---------------------------------------------------------------------------
// contrastWcag21
// ---------------------------------------------------------------------------

test('Math contrastWcag21 :: happy :: white on black ≈ 21', () => {
  const white = hexToRgb.apply('#ffffff');
  const black = hexToRgb.apply('#000000');
  const ratio = contrastWcag21.apply(black, white);
  assert.ok(Math.abs(ratio - 21) < 0.5, `expected ≈ 21, got ${ratio}`);
});

test('Math contrastWcag21 :: happy :: #777777 on white ≈ 4.48', () => {
  const gray  = hexToRgb.apply('#777777');
  const white = hexToRgb.apply('#ffffff');
  const ratio = contrastWcag21.apply(gray, white);
  assert.ok(Math.abs(ratio - 4.48) < 0.1, `expected ≈ 4.48, got ${ratio}`);
});

test('Math contrastWcag21 :: edge :: same color on itself = 1', () => {
  const mid   = hexToRgb.apply('#808080');
  const ratio = contrastWcag21.apply(mid, mid);
  assert.ok(Math.abs(ratio - 1) < 0.01, `expected 1, got ${ratio}`);
});

// ---------------------------------------------------------------------------
// clusterMedianCut
// ---------------------------------------------------------------------------

test('Math e2e :: happy :: clusterMedianCut(100, k=8) returns exactly 8 records', () => {
  const colors: ColorRecordInterface[] = [];
  for (let i = 0; i < 100; i++) {
    const v = i / 100;
    colors.push(oklchToRgb.apply(v, 0, 0));
  }
  const result = clusterMedianCut.apply(colors, 8);
  assert.strictEqual(result.length, 8, `expected 8 clusters, got ${result.length}`);
});

// ---------------------------------------------------------------------------
// lighten / darken
// ---------------------------------------------------------------------------

test('Math e2e :: edge :: lighten(color, 0.0) is identity', () => {
  const base = hexToRgb.apply('#5b21b6');
  const out  = lighten.apply(base, 0);
  assert.strictEqual(out.hex, base.hex, 'lighten(x, 0) should be identity');
});

test('Math e2e :: edge :: darken(color, 0.0) is identity', () => {
  const base = hexToRgb.apply('#5b21b6');
  const out  = darken.apply(base, 0);
  assert.strictEqual(out.hex, base.hex, 'darken(x, 0) should be identity');
});

// ---------------------------------------------------------------------------
// oklchToRgb / rgbToOklch round-trip within 0.001
// Uses in-gamut values only (avoids clamping artefacts at gamut boundary).
// ---------------------------------------------------------------------------

test('Math e2e :: happy :: oklchToRgb → rgbToOklch round-trip within 0.001', () => {
  const inputs = [
    { l: 0.5, c: 0.1,  h: 30  },
    { l: 0.7, c: 0.12, h: 180 },
    { l: 0.2, c: 0.05, h: 320 },
    { l: 1.0, c: 0.0,  h: 0   },
    { l: 0.0, c: 0.0,  h: 0   },
  ];

  for (const { l, c, h } of inputs) {
    const asRecord = oklchToRgb.apply(l, c, h);
    const back     = rgbToOklch.apply(asRecord.rgb.r, asRecord.rgb.g, asRecord.rgb.b);

    const eps = 0.001;
    assert.ok(
      Math.abs(back.oklch.l - l) < eps,
      `L round-trip failed for (${l},${c},${h}): got ${back.oklch.l}`,
    );
    assert.ok(
      Math.abs(back.oklch.c - c) < eps,
      `C round-trip failed for (${l},${c},${h}): got ${back.oklch.c}`,
    );
    // Skip hue round-trip check when c≈0 (achromatic — hue is undefined)
    if (c > 0.001) {
      const hueDiff           = Math.abs(((back.oklch.h - h) + 360) % 360);
      const normalizedHueDiff = hueDiff > 180 ? 360 - hueDiff : hueDiff;
      assert.ok(
        normalizedHueDiff < 2,
        `H round-trip failed for (${l},${c},${h}): got ${back.oklch.h}, diff ${normalizedHueDiff}`,
      );
    }
  }
});
