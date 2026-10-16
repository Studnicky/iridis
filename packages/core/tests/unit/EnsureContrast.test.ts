import assert from 'node:assert/strict';
import { test } from 'node:test';

import { colorRecordFactory, contrastWcag21, ensureContrast } from '../../src/math/index.ts';

void test('ensureContrast searches the opposite lightness direction when white misses the required ratio', () => {
  const accent = colorRecordFactory.fromHex('#8b5cf6');
  const white = colorRecordFactory.fromHex('#ffffff');
  const result = ensureContrast.apply(white, accent, 4.5, 'wcag21');
  const ratio = contrastWcag21.apply(result, accent);

  assert.ok(ratio >= 4.5, `expected the opposite direction to reach 4.5:1, got ${ratio.toFixed(3)}:1`);
  assert.ok(result.oklch.l < white.oklch.l, 'the reachable candidate darkens the initial white foreground');
});

void test('ensureContrast preserves a bounded maximum ratio while reducing excessive contrast', () => {
  const black = colorRecordFactory.fromHex('#000000');
  const white = colorRecordFactory.fromHex('#ffffff');
  const result = ensureContrast.apply(black, white, 4.5, { 'algorithm': 'wcag21', 'maximumRatio': 7 });
  const ratio = contrastWcag21.apply(result, white);

  assert.ok(ratio >= 4.5, `expected at least 4.5:1, got ${ratio.toFixed(3)}:1`);
  assert.ok(ratio <= 7, `expected no more than 7:1, got ${ratio.toFixed(3)}:1`);
  assert.ok(result.oklch.l > black.oklch.l, 'the bounded candidate lightens the initial black foreground');
});

void test('ensureContrast refines to the exact lower contrast boundary', () => {
  const background = colorRecordFactory.fromHex('#89c1d6');
  const foreground = colorRecordFactory.fromHex('#dc855d');
  const result = ensureContrast.apply(foreground, background, 4.5, 'wcag21');
  const ratio = contrastWcag21.apply(result, background);

  assert.ok(ratio >= 4.5, `expected the exact 4.5:1 lower bound, got ${ratio}:1`);
});

void test('ensureContrast keeps a refined candidate inside a narrow bounded contrast band', () => {
  const background = colorRecordFactory.fromHex('#89c1d6');
  const foreground = colorRecordFactory.fromHex('#dc855d');
  const result = ensureContrast.apply(foreground, background, 4.5, { 'algorithm': 'wcag21', 'maximumRatio': 4.6 });
  const ratio = contrastWcag21.apply(result, background);

  assert.ok(ratio >= 4.5, `expected at least 4.5:1, got ${ratio}:1`);
  assert.ok(ratio <= 4.6, `expected no more than 4.6:1, got ${ratio}:1`);
});

void test('ensureContrast returns its best endpoint when no representable candidate meets the requested band', () => {
  const background = colorRecordFactory.fromHex('#777777');
  const foreground = colorRecordFactory.fromHex('#777777');
  const result = ensureContrast.apply(foreground, background, 22, 'wcag21');
  const ratio = contrastWcag21.apply(result, background);

  assert.ok(ratio < 22, `expected the impossible 22:1 request to remain unsatisfied, got ${ratio}:1`);
});

void test('ensureContrast finds a bounded band between two out-of-band endpoints', () => {
  const background = colorRecordFactory.fromHex('#808080');
  const foreground = colorRecordFactory.fromHex('#ffffff');
  const result = ensureContrast.apply(foreground, background, 1.5, { 'algorithm': 'wcag21', 'maximumRatio': 2 });
  const ratio = contrastWcag21.apply(result, background);

  assert.ok(ratio >= 1.5, `expected at least 1.5:1, got ${ratio}:1`);
  assert.ok(ratio <= 2, `expected no more than 2:1, got ${ratio}:1`);
});

void test('ensureContrast measures the gamut-mapped record it returns', () => {
  const background = colorRecordFactory.fromHex('#89c1d6');
  const foreground = colorRecordFactory.fromOklch(0.7, 0.4, 20);
  const result = ensureContrast.apply(foreground, background, 4.5, { 'algorithm': 'wcag21', 'maximumRatio': 4.6 });
  const ratio = contrastWcag21.apply(result, background);

  assert.notEqual(foreground.displayP3, undefined, 'expected an out-of-sRGB foreground');
  assert.ok(ratio >= 4.5, `expected at least 4.5:1 from the returned record, got ${ratio}:1`);
  assert.ok(ratio <= 4.6, `expected no more than 4.6:1 from the returned record, got ${ratio}:1`);
});
