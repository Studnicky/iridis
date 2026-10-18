import { evaluate } from '@studnicky/iridis-anima';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ValueBinding } from '../src/ValueBinding.ts';
import { ValueBindingPaletteFixture } from './fixtures/ValueBindingPaletteFixture.ts';

void test('scroll position drives a real anima palette evaluation via ValueBinding', () => {
  const scroll = ValueBinding.create({ 'maximum': 500, 'minimum': 0 });

  let scrollY = 0;
  const startPalette = evaluate(ValueBindingPaletteFixture.from, ValueBindingPaletteFixture.to, scroll.mapToT(scrollY));
  const startBackground = startPalette.background;
  const startAccent = startPalette.accent;
  assert.ok(startBackground !== undefined);
  assert.ok(startAccent !== undefined);
  assert.strictEqual(startBackground.l, ValueBindingPaletteFixture.from.background.l);
  assert.strictEqual(startAccent.h, ValueBindingPaletteFixture.from.accent.h);

  scrollY = 250;
  const midPalette = evaluate(ValueBindingPaletteFixture.from, ValueBindingPaletteFixture.to, scroll.mapToT(scrollY));
  const midBackground = midPalette.background;
  assert.ok(midBackground !== undefined);
  assert.ok(Math.abs(midBackground.l - 0.54) < 1e-6, 'midpoint L must be 0.54');

  scrollY = 500;
  const endPalette = evaluate(ValueBindingPaletteFixture.from, ValueBindingPaletteFixture.to, scroll.mapToT(scrollY));
  const endBackground = endPalette.background;
  const endAccent = endPalette.accent;
  assert.ok(endBackground !== undefined);
  assert.ok(endAccent !== undefined);
  assert.ok(Math.abs(endBackground.l - ValueBindingPaletteFixture.to.background.l) < 1e-9);
  assert.strictEqual(endAccent.h, ValueBindingPaletteFixture.to.accent.h);
});
