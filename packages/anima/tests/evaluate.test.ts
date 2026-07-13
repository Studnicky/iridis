import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { evaluate, evaluateStops } from '../src/index.ts';

const FROM: PaletteInterfaceType = {
  'accent':     { 'c': 0.15, 'h': 10, 'l': 0.55 },
  'background': { 'c': 0.02, 'h': 240, 'l': 0.98 }
};

const TO: PaletteInterfaceType = {
  'accent':     { 'c': 0.15, 'h': 240, 'l': 0.55 },
  'background': { 'c': 0.02, 'h': 240, 'l': 0.10 }
};

const assertPaletteClose = (actual: PaletteInterfaceType, expected: PaletteInterfaceType): void => {
  for (const role of Object.keys(expected)) {
    const a = actual[role]!;
    const e = expected[role]!;
    assert.ok(Math.abs(a.l - e.l) < 1e-9, `role ${role} l: ${a.l} ~= ${e.l}`);
    assert.ok(Math.abs(a.c - e.c) < 1e-9, `role ${role} c: ${a.c} ~= ${e.c}`);
    assert.ok(Math.abs(a.h - e.h) < 1e-9, `role ${role} h: ${a.h} ~= ${e.h}`);
  }
};

test('evaluate: t=0 returns the from-palette, t=1 returns the to-palette', () => {
  const start = evaluate(FROM, TO, 0);
  const end   = evaluate(FROM, TO, 1);
  assertPaletteClose(start, FROM);
  assertPaletteClose(end, TO);
});

test('evaluate: t=0.5 with linear easing lands at the per-role midpoint', () => {
  const mid = evaluate(FROM, TO, 0.5);
  assert.ok(Math.abs(mid['background']!.l - 0.54) < 1e-6, `background L midpoint, got ${mid['background']!.l}`);
});

test('evaluate: an easing function reshapes progress before lerp', () => {
  const linearMid = evaluate(FROM, TO, 0.5).background!.l;
  const steppedEarly = evaluate(FROM, TO, 0.5, { 'easing': () => 0.1 }).background!.l;
  assert.notStrictEqual(linearMid, steppedEarly);
});

test('evaluate: chromaticDetourRoles routes the accent hue through green at t=0.5', () => {
  const mid = evaluate(FROM, TO, 0.5, {
    'chromaticDetourRoles': ['accent'],
    'hueDirection':         'clockwise'
  });
  assert.ok(mid['accent']!.h >= 90 && mid['accent']!.h <= 150, `accent hue ${mid['accent']!.h} in green band`);
});

test('evaluateStops: t=0 and t=1 return the first and last stops', () => {
  const middle: PaletteInterfaceType = {
    'accent':     { 'c': 0.15, 'h': 120, 'l': 0.55 },
    'background': { 'c': 0.02, 'h': 240, 'l': 0.50 }
  };
  const start = evaluateStops([FROM, middle, TO], 0);
  const end   = evaluateStops([FROM, middle, TO], 1);
  assertPaletteClose(start, FROM);
  assertPaletteClose(end, TO);
});

test('evaluateStops: t maps into the correct segment across N-1 segments', () => {
  const middle: PaletteInterfaceType = {
    'accent':     { 'c': 0.15, 'h': 120, 'l': 0.55 },
    'background': { 'c': 0.02, 'h': 240, 'l': 0.50 }
  };
  // 2 segments across [0,1]; t=0.5 lands exactly on the middle stop.
  const atMiddle = evaluateStops([FROM, middle, TO], 0.5);
  assert.deepStrictEqual(atMiddle, middle);
});
