import { PaletteEntity } from '@studnicky/iridis-algebra';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cubicBezier, evaluate, evaluateStops, hueInterpolations } from '../src/index.ts';
import { EvaluatePaletteFixture } from './fixtures/EvaluatePaletteFixture.ts';

class PaletteAssertions {
  static close(actual: PaletteEntity.Type, expected: PaletteEntity.Type): void {
    const actualByRole = new Map(Object.entries(actual));
    const expectedEntries = Object.entries(expected);
    for (let index = 0; index < expectedEntries.length; index += 1) {
      const entry = expectedEntries[index];
      if (entry === undefined) {
        continue;
      }
      const [roleName, expectedColor] = entry;
      const actualColor = actualByRole.get(roleName);
      if (actualColor === undefined) {
        throw new Error(`missing evaluated role ${roleName}`);
      }
      assert.ok(Math.abs(actualColor.l - expectedColor.l) < 1e-9, `role ${roleName} l: ${actualColor.l} ~= ${expectedColor.l}`);
      assert.ok(Math.abs(actualColor.c - expectedColor.c) < 1e-9, `role ${roleName} c: ${actualColor.c} ~= ${expectedColor.c}`);
      assert.ok(Math.abs(actualColor.h - expectedColor.h) < 1e-9, `role ${roleName} h: ${actualColor.h} ~= ${expectedColor.h}`);
    }
  }
}

await test('evaluate: t=0 returns the from-palette, t=1 returns the to-palette', () => {
  const start = evaluate(EvaluatePaletteFixture.from, EvaluatePaletteFixture.to, 0);
  const end = evaluate(EvaluatePaletteFixture.from, EvaluatePaletteFixture.to, 1);
  PaletteAssertions.close(start, EvaluatePaletteFixture.from);
  PaletteAssertions.close(end, EvaluatePaletteFixture.to);
});

await test('evaluate: t=0.5 with linear easing lands at the per-role midpoint', () => {
  const mid = evaluate(EvaluatePaletteFixture.from, EvaluatePaletteFixture.to, 0.5);
  const background = mid.background;
  if (background === undefined) {
    throw new Error('evaluated palette omits background');
  }
  assert.ok(Math.abs(background.l - 0.54) < 1e-6, `background L midpoint, got ${background.l}`);
});

await test('evaluate: an easing function reshapes progress before lerp', () => {
  const linearFrame = evaluate(EvaluatePaletteFixture.from, EvaluatePaletteFixture.to, 0.5);
  const easedFrame = evaluate(EvaluatePaletteFixture.from, EvaluatePaletteFixture.to, 0.5, { 'easing': cubicBezier(0.42, 0, 1, 1) });
  const linearBackground = linearFrame.background;
  const easedBackground = easedFrame.background;
  if (linearBackground === undefined || easedBackground === undefined) {
    throw new Error('evaluated palette omits background');
  }
  assert.notStrictEqual(linearBackground.l, easedBackground.l);
});

await test('evaluate: chromaticDetourRoles routes the accent hue through green at t=0.5', () => {
  const mid = evaluate(EvaluatePaletteFixture.from, EvaluatePaletteFixture.to, 0.5, {
    'chromaticDetourRoles': ['accent'],
    'hueInterpolation': hueInterpolations.clockwise
  });
  const accent = mid.accent;
  if (accent === undefined) {
    throw new Error('evaluated palette omits accent');
  }
  assert.ok(accent.h >= 90 && accent.h <= 150, `accent hue ${accent.h} in green band`);
});

await test('evaluateStops: t=0 and t=1 return the first and last stops', () => {
  const middle = PaletteEntity.create({
    'accent':     { 'c': 0.15, 'h': 120, 'l': 0.55 },
    'background': { 'c': 0.02, 'h': 240, 'l': 0.50 }
  });
  const start = evaluateStops([EvaluatePaletteFixture.from, middle, EvaluatePaletteFixture.to], 0);
  const end = evaluateStops([EvaluatePaletteFixture.from, middle, EvaluatePaletteFixture.to], 1);
  PaletteAssertions.close(start, EvaluatePaletteFixture.from);
  PaletteAssertions.close(end, EvaluatePaletteFixture.to);
});

await test('evaluateStops: t maps into the correct segment across N-1 segments', () => {
  const middle = PaletteEntity.create({
    'accent':     { 'c': 0.15, 'h': 120, 'l': 0.55 },
    'background': { 'c': 0.02, 'h': 240, 'l': 0.50 }
  });
  const atMiddle = evaluateStops([EvaluatePaletteFixture.from, middle, EvaluatePaletteFixture.to], 0.5);
  assert.deepStrictEqual(atMiddle, middle);
});
