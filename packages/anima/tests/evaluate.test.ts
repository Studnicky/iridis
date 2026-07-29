import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cubicBezier, evaluate, evaluateStops } from '../src/index.ts';

const FROM: PaletteInterfaceType = {
  'accent':     { 'c': 0.15, 'h': 10, 'l': 0.55 },
  'background': { 'c': 0.02, 'h': 240, 'l': 0.98 }
};

const TO: PaletteInterfaceType = {
  'accent':     { 'c': 0.15, 'h': 240, 'l': 0.55 },
  'background': { 'c': 0.02, 'h': 240, 'l': 0.10 }
};

class PaletteAssertions {
  static close(actual: PaletteInterfaceType, expected: PaletteInterfaceType): void {
    for (const role of Object.keys(expected)) {
      const actualColor = actual[role]!;
      const expectedColor = expected[role]!;
      assert.ok(Math.abs(actualColor.l - expectedColor.l) < 1e-9, `role ${role} l: ${actualColor.l} ~= ${expectedColor.l}`);
      assert.ok(Math.abs(actualColor.c - expectedColor.c) < 1e-9, `role ${role} c: ${actualColor.c} ~= ${expectedColor.c}`);
      assert.ok(Math.abs(actualColor.h - expectedColor.h) < 1e-9, `role ${role} h: ${actualColor.h} ~= ${expectedColor.h}`);
    }
  }
}

await test('evaluate: t=0 returns the from-palette, t=1 returns the to-palette', () => {
  const start = evaluate(FROM, TO, 0);
  const end   = evaluate(FROM, TO, 1);
  PaletteAssertions.close(start, FROM);
  PaletteAssertions.close(end, TO);
});

await test('evaluate: t=0.5 with linear easing lands at the per-role midpoint', () => {
  const mid = evaluate(FROM, TO, 0.5);
  assert.ok(Math.abs(mid.background!.l - 0.54) < 1e-6, `background L midpoint, got ${mid.background!.l}`);
});

await test('evaluate: an easing function reshapes progress before lerp', () => {
  const linearMid = evaluate(FROM, TO, 0.5).background!.l;
  const steppedEarly = evaluate(FROM, TO, 0.5, { 'chromaticDetourRoles': undefined, 'easing': cubicBezier(0.42, 0, 1, 1), 'hueDirection': undefined }).background!.l;
  assert.notStrictEqual(linearMid, steppedEarly);
});

await test('evaluate: chromaticDetourRoles routes the accent hue through green at t=0.5', () => {
  const mid = evaluate(FROM, TO, 0.5, {
    'chromaticDetourRoles': ['accent'],
    'easing':               undefined,
    'hueDirection':         'clockwise'
  });
  assert.ok(mid.accent!.h >= 90 && mid.accent!.h <= 150, `accent hue ${mid.accent!.h} in green band`);
});

await test('evaluateStops: t=0 and t=1 return the first and last stops', () => {
  const middle: PaletteInterfaceType = {
    'accent':     { 'c': 0.15, 'h': 120, 'l': 0.55 },
    'background': { 'c': 0.02, 'h': 240, 'l': 0.50 }
  };
  const start = evaluateStops([FROM, middle, TO], 0);
  const end   = evaluateStops([FROM, middle, TO], 1);
  PaletteAssertions.close(start, FROM);
  PaletteAssertions.close(end, TO);
});

await test('evaluateStops: t maps into the correct segment across N-1 segments', () => {
  const middle: PaletteInterfaceType = {
    'accent':     { 'c': 0.15, 'h': 120, 'l': 0.55 },
    'background': { 'c': 0.02, 'h': 240, 'l': 0.50 }
  };
  // 2 segments across [0,1]; t=0.5 lands exactly on the middle stop.
  const atMiddle = evaluateStops([FROM, middle, TO], 0.5);
  assert.deepStrictEqual(atMiddle, middle);
});
