import assert from 'node:assert';
import { test } from 'node:test';

import { drift, lerp, LerpOptionsInterfaceTypeEntity, nearest, PaletteInterfaceTypeEntity, perpendicular, subtract } from '../src/index.ts';
import { ALGEBRA_PALETTES } from './fixtures/AlgebraPalettes.ts';

void test('lerp at t=0 returns a', () => {
  const result = lerp(ALGEBRA_PALETTES.a, ALGEBRA_PALETTES.b, 0);
  assert.deepStrictEqual(result, ALGEBRA_PALETTES.a);
});

void test('lerp at t=1 returns b', () => {
  const result = lerp(ALGEBRA_PALETTES.a, ALGEBRA_PALETTES.b, 1);
  assert.ok(Math.abs((result.background?.l ?? NaN) - (ALGEBRA_PALETTES.b.background?.l ?? NaN)) < 1e-9);
  assert.ok(Math.abs((result.text?.l ?? NaN) - (ALGEBRA_PALETTES.b.text?.l ?? NaN)) < 1e-9);
  assert.strictEqual(result.background?.h, ALGEBRA_PALETTES.b.background?.h);
  assert.strictEqual(result.text?.h, ALGEBRA_PALETTES.b.text?.h);
});

void test('lerp at t=0.5 returns the midpoint', () => {
  const result = lerp(ALGEBRA_PALETTES.a, ALGEBRA_PALETTES.b, 0.5);
  assert.ok(Math.abs((result.background?.l ?? NaN) - 0.5) < 1e-9);
  assert.ok(Math.abs((result.background?.c ?? NaN) - 0.1) < 1e-9);
  assert.ok(Math.abs((result.text?.l ?? NaN) - 0.6) < 1e-9);
});

void test('lerp hue wraparound: shortestArc from 350 to 10 passes through 360/0', () => {
  const a = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.1, 'h': 350, 'l': 0.5 } });
  const b = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.1, 'h': 10, 'l': 0.5 } });
  const result = lerp(a, b, 0.5);
  assert.strictEqual(result.role?.h, 0);
});

void test('lerp hue wraparound: clockwise from 350 to 10 also takes the short forward sweep here', () => {
  const a = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.1, 'h': 350, 'l': 0.5 } });
  const b = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.1, 'h': 10, 'l': 0.5 } });
  const options = LerpOptionsInterfaceTypeEntity.create({ 'hueDirection': 'clockwise' });
  const result = lerp(a, b, 0.5, options);
  assert.strictEqual(result.role?.h, 0);
});

void test('lerp hue wraparound: counterClockwise from 350 to 10 goes the long way through 180', () => {
  const a = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.1, 'h': 350, 'l': 0.5 } });
  const b = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.1, 'h': 10, 'l': 0.5 } });
  const options = LerpOptionsInterfaceTypeEntity.create({ 'hueDirection': 'counterClockwise' });
  const result = lerp(a, b, 0.5, options);
  assert.strictEqual(result.role?.h, 180);
});

void test('subtract wraps the hue delta to [-180, 180]', () => {
  const a = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.2, 'h': 10, 'l': 0.6 } });
  const b = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.1, 'h': 350, 'l': 0.4 } });
  const result = subtract(a, b);
  assert.ok(Math.abs((result.role?.l ?? NaN) - 0.2) < 1e-9);
  assert.ok(Math.abs((result.role?.c ?? NaN) - 0.1) < 1e-9);
  assert.strictEqual(result.role?.h, 20);
});

void test('nearest picks the closest of several corpus entries', () => {
  const target = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.1, 'h': 100, 'l': 0.5 } });
  const close = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.1, 'h': 101, 'l': 0.51 } });
  const middle = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.2, 'h': 150, 'l': 0.7 } });
  const far = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.4, 'h': 300, 'l': 0.1 } });
  const result = nearest(target, [far, middle, close]);
  assert.strictEqual(result, close);
});

void test('drift returns false below the threshold and true above it', () => {
  const current = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.1, 'h': 100, 'l': 0.5 } });
  const derived = PaletteInterfaceTypeEntity.create({ 'role': { 'c': 0.1, 'h': 100, 'l': 0.51 } });
  assert.strictEqual(drift(current, derived, 0.5), false);
  assert.strictEqual(drift(current, derived, 0.005), true);
});

void test('perpendicular only moves chroma on the targeted role', () => {
  const palette = PaletteInterfaceTypeEntity.create({
    'accent':     { 'c': 0.2, 'h': 250, 'l': 0.5 },
    'background': { 'c': 0.05, 'h': 200, 'l': 0.2 }
  });
  const result = perpendicular(palette, 'accent', 0.1);
  assert.strictEqual(result.accent?.l, 0.5);
  assert.strictEqual(result.accent?.h, 250);
  assert.ok(Math.abs((result.accent?.c ?? NaN) - 0.3) < 1e-9);
  assert.deepStrictEqual(result.background, palette.background);
});

void test('perpendicular clamps chroma into [0, 0.5]', () => {
  const palette = PaletteInterfaceTypeEntity.create({ 'accent': { 'c': 0.48, 'h': 250, 'l': 0.5 } });
  assert.strictEqual(perpendicular(palette, 'accent', 0.1).accent?.c, 0.5);
  assert.strictEqual(perpendicular(palette, 'accent', -1).accent?.c, 0);
});
