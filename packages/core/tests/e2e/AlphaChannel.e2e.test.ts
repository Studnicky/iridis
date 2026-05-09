/**
 * Alpha-channel contract across math primitives.
 *
 * Documents and tests:
 *   - colorRecordFactory.fromHex parses #rrggbbaa (8-digit) into alpha
 *   - colorRecordFactory.fromOklch / fromRgb take an explicit alpha arg
 *   - mixOklch / mixHsl / mixSrgb lerp alpha between two records
 *   - lighten / darken / saturate / desaturate / hueShift PRESERVE alpha
 *   - ensureContrast PRESERVES the foreground's alpha (not the bg's)
 */

import { test } from 'node:test';

import {
  colorRecordFactory,
  mixOklch,
  lighten,
  darken,
  saturate,
  desaturate,
  hueShift,
  ensureContrast,
} from '@studnicky/iridis';
import { assert } from './ScenarioRunner.ts';

const APPROX = 1 / 255;

test('Alpha :: fromHex :: 6-digit defaults alpha to 1', () => {
  const c = colorRecordFactory.fromHex('#7c3aed');
  assert.strictEqual(c.alpha, 1);
  assert.strictEqual(c.hex, '#7c3aed');
});

test('Alpha :: fromHex :: 8-digit parses #rrggbbaa', () => {
  const c = colorRecordFactory.fromHex('#7c3aed80');
  assert.ok(Math.abs(c.alpha - (0x80 / 255)) < APPROX, `alpha was ${c.alpha}`);
  // Canonical hex slot stays 6-digit; alpha is its own field.
  assert.strictEqual(c.hex, '#7c3aed');
});

test('Alpha :: fromHex :: fully transparent #rrggbb00', () => {
  const c = colorRecordFactory.fromHex('#7c3aed00');
  assert.strictEqual(c.alpha, 0);
});

test('Alpha :: fromHex :: invalid 7-digit throws', () => {
  let threw = false;
  try { colorRecordFactory.fromHex('#1234567'); } catch { threw = true; }
  assert.ok(threw, 'should reject 7-digit hex');
});

test('Alpha :: fromOklch :: alpha argument honored and clamped', () => {
  const c = colorRecordFactory.fromOklch(0.5, 0.1, 200, 0.5);
  assert.strictEqual(c.alpha, 0.5);
  const clampedHigh = colorRecordFactory.fromOklch(0.5, 0.1, 200, 2.5);
  assert.strictEqual(clampedHigh.alpha, 1);
  const clampedLow = colorRecordFactory.fromOklch(0.5, 0.1, 200, -0.5);
  assert.strictEqual(clampedLow.alpha, 0);
});

test('Alpha :: mixOklch :: lerps alpha between endpoints', () => {
  const a = colorRecordFactory.fromOklch(0.5, 0.1, 0,   0.0);
  const b = colorRecordFactory.fromOklch(0.5, 0.1, 0,   1.0);
  const mixed = mixOklch.apply(a, b, 0.25);
  assert.ok(Math.abs((mixed as { 'alpha': number }).alpha - 0.25) < 1e-9);
});

test('Alpha :: lighten :: preserves source alpha', () => {
  const c = colorRecordFactory.fromOklch(0.4, 0.1, 200, 0.42);
  const out = lighten.apply(c, 0.1) as { 'alpha': number };
  assert.strictEqual(out.alpha, 0.42);
});

test('Alpha :: darken :: preserves source alpha', () => {
  const c = colorRecordFactory.fromOklch(0.7, 0.1, 200, 0.33);
  const out = darken.apply(c, 0.15) as { 'alpha': number };
  assert.strictEqual(out.alpha, 0.33);
});

test('Alpha :: saturate :: preserves source alpha', () => {
  const c = colorRecordFactory.fromOklch(0.5, 0.05, 100, 0.7);
  const out = saturate.apply(c, 0.05) as { 'alpha': number };
  assert.strictEqual(out.alpha, 0.7);
});

test('Alpha :: desaturate :: preserves source alpha', () => {
  const c = colorRecordFactory.fromOklch(0.5, 0.20, 100, 0.7);
  const out = desaturate.apply(c, 0.05) as { 'alpha': number };
  assert.strictEqual(out.alpha, 0.7);
});

test('Alpha :: hueShift :: preserves source alpha', () => {
  const c = colorRecordFactory.fromOklch(0.5, 0.15, 100, 0.6);
  const out = hueShift.apply(c, 90) as { 'alpha': number };
  assert.strictEqual(out.alpha, 0.6);
});

test('Alpha :: ensureContrast :: preserves the foreground alpha', () => {
  const fg = colorRecordFactory.fromOklch(0.50, 0.05, 200, 0.85);
  const bg = colorRecordFactory.fromOklch(0.55, 0.05, 200, 1.0);
  const out = ensureContrast.apply(fg, bg, 4.5, 'wcag21') as { 'alpha': number };
  assert.strictEqual(out.alpha, 0.85);
});
