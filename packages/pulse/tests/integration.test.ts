import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';
import { evaluate } from '@studnicky/iridis-anima';

import { ValueBinding } from '../src/ValueBinding.ts';

const FROM: PaletteInterfaceType = {
  'accent':     { 'c': 0.15, 'h': 10, 'l': 0.55 },
  'background': { 'c': 0.02, 'h': 240, 'l': 0.98 }
};

const TO: PaletteInterfaceType = {
  'accent':     { 'c': 0.15, 'h': 240, 'l': 0.55 },
  'background': { 'c': 0.02, 'h': 240, 'l': 0.10 }
};

test('scroll position drives a real anima palette evaluation via ValueBinding', () => {
  const scroll = ValueBinding.create({ 'max': 500, 'min': 0 });

  let scrollY = 0;
  const startPalette = evaluate(FROM, TO, scroll.mapToT(scrollY));
  assert.strictEqual(startPalette['background']!.l, FROM['background']!.l);
  assert.strictEqual(startPalette['accent']!.h, FROM['accent']!.h);

  scrollY = 250;
  const midPalette = evaluate(FROM, TO, scroll.mapToT(scrollY));
  assert.ok(Math.abs(midPalette['background']!.l - 0.54) < 1e-6, `midpoint L, got ${midPalette['background']!.l}`);

  scrollY = 500;
  const endPalette = evaluate(FROM, TO, scroll.mapToT(scrollY));
  assert.ok(Math.abs(endPalette['background']!.l - TO['background']!.l) < 1e-9);
  assert.strictEqual(endPalette['accent']!.h, TO['accent']!.h);
});
