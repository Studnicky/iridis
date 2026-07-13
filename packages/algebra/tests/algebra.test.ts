import assert from 'node:assert';
import { test } from 'node:test';
import { drift, lerp, nearest, perpendicular, subtract } from '../src/index.ts';
import type { PaletteInterfaceType } from '../src/index.ts';

const paletteA: PaletteInterfaceType = {
  background: { l: 0.2, c: 0.05, h: 200 },
  text:       { l: 0.9, c: 0.02, h: 100 }
};

const paletteB: PaletteInterfaceType = {
  background: { l: 0.8, c: 0.15, h: 300 },
  text:       { l: 0.3, c: 0.1,  h: 20 }
};

test('lerp at t=0 returns a', () => {
  assert.deepStrictEqual(lerp(paletteA, paletteB, 0), paletteA);
});

test('lerp at t=1 returns b', () => {
  const end = lerp(paletteA, paletteB, 1);
  assert.ok(Math.abs((end.background?.l ?? NaN) - (paletteB.background?.l ?? NaN)) < 1e-9);
  assert.ok(Math.abs((end.text?.l ?? NaN) - (paletteB.text?.l ?? NaN)) < 1e-9);
  assert.deepStrictEqual(end.background?.h, paletteB.background?.h);
  assert.deepStrictEqual(end.text?.h, paletteB.text?.h);
});

test('lerp at t=0.5 returns the midpoint', () => {
  const mid = lerp(paletteA, paletteB, 0.5);
  assert.strictEqual(mid.background?.l, 0.5);
  assert.strictEqual(mid.background?.c, 0.1);
  assert.strictEqual(mid.text?.l, 0.6);
});

test('lerp hue wraparound: shortestArc from 350 to 10 passes through 360/0', () => {
  const a: PaletteInterfaceType = { role: { l: 0.5, c: 0.1, h: 350 } };
  const b: PaletteInterfaceType = { role: { l: 0.5, c: 0.1, h: 10 } };
  const mid = lerp(a, b, 0.5);
  assert.strictEqual(mid.role?.h, 0);
});

test('lerp hue wraparound: clockwise from 350 to 10 also takes the short forward sweep here', () => {
  const a: PaletteInterfaceType = { role: { l: 0.5, c: 0.1, h: 350 } };
  const b: PaletteInterfaceType = { role: { l: 0.5, c: 0.1, h: 10 } };
  const mid = lerp(a, b, 0.5, { hueDirection: 'clockwise' });
  assert.strictEqual(mid.role?.h, 0);
});

test('lerp hue wraparound: counterClockwise from 350 to 10 goes the long way through 180', () => {
  const a: PaletteInterfaceType = { role: { l: 0.5, c: 0.1, h: 350 } };
  const b: PaletteInterfaceType = { role: { l: 0.5, c: 0.1, h: 10 } };
  const mid = lerp(a, b, 0.5, { hueDirection: 'counterClockwise' });
  assert.strictEqual(mid.role?.h, 180);
});

test('subtract wraps the hue delta to [-180, 180]', () => {
  const a: PaletteInterfaceType = { role: { l: 0.6, c: 0.2, h: 10 } };
  const b: PaletteInterfaceType = { role: { l: 0.4, c: 0.1, h: 350 } };
  const delta = subtract(a, b);
  assert.ok(Math.abs((delta.role?.l ?? NaN) - 0.2) < 1e-9);
  assert.ok(Math.abs((delta.role?.c ?? NaN) - 0.1) < 1e-9);
  assert.strictEqual(delta.role?.h, 20);
});

test('nearest picks the closest of several corpus entries', () => {
  const target: PaletteInterfaceType = { role: { l: 0.5, c: 0.1, h: 100 } };
  const close: PaletteInterfaceType  = { role: { l: 0.51, c: 0.1, h: 101 } };
  const mid: PaletteInterfaceType    = { role: { l: 0.7, c: 0.2, h: 150 } };
  const far: PaletteInterfaceType    = { role: { l: 0.1, c: 0.4, h: 300 } };

  assert.strictEqual(nearest(target, [far, mid, close]), close);
});

test('drift returns false below the threshold and true above it', () => {
  const current: PaletteInterfaceType = { role: { l: 0.5, c: 0.1, h: 100 } };
  const derived: PaletteInterfaceType = { role: { l: 0.51, c: 0.1, h: 100 } };

  assert.strictEqual(drift(current, derived, 0.5), false);
  assert.strictEqual(drift(current, derived, 0.005), true);
});

test('perpendicular only moves chroma on the targeted role', () => {
  const palette: PaletteInterfaceType = {
    accent:     { l: 0.5, c: 0.2, h: 250 },
    background: { l: 0.2, c: 0.05, h: 200 }
  };

  const moved = perpendicular(palette, 'accent', 0.1);

  assert.strictEqual(moved.accent?.l, 0.5);
  assert.strictEqual(moved.accent?.h, 250);
  assert.ok(Math.abs((moved.accent?.c ?? NaN) - 0.3) < 1e-9);
  assert.deepStrictEqual(moved.background, palette.background);
});

test('perpendicular clamps chroma into [0, 0.5]', () => {
  const palette: PaletteInterfaceType = { accent: { l: 0.5, c: 0.48, h: 250 } };
  assert.strictEqual(perpendicular(palette, 'accent', 0.1).accent?.c, 0.5);
  assert.strictEqual(perpendicular(palette, 'accent', -1).accent?.c, 0);
});
