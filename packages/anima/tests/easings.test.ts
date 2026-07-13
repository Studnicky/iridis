import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chromaticDetourHue, cubicBezier, linear, spring } from '../src/easings/index.ts';

test('linear: t=0/0.5/1 passes through unchanged', () => {
  assert.strictEqual(linear(0), 0);
  assert.strictEqual(linear(0.5), 0.5);
  assert.strictEqual(linear(1), 1);
});

test('cubicBezier: pinned endpoints, ease-like midpoint bounded in [0, 1]', () => {
  const easeInOut = cubicBezier(0.42, 0, 0.58, 1);
  assert.strictEqual(easeInOut(0), 0);
  assert.strictEqual(easeInOut(1), 1);
  const mid = easeInOut(0.5);
  assert.ok(mid > 0 && mid < 1, `midpoint ${mid} within (0, 1)`);
});

test('cubicBezier: linear control points approximate the identity curve', () => {
  const identity = cubicBezier(0.25, 0.25, 0.75, 0.75);
  assert.ok(Math.abs(identity(0.5) - 0.5) < 1e-6, `midpoint ${identity(0.5)} close to 0.5`);
});

test('spring: pinned endpoints, settles toward 1 near t=1', () => {
  const ease = spring();
  assert.strictEqual(ease(0), 0);
  assert.strictEqual(ease(1), 1);
  const nearEnd = spring()(0.98);
  assert.ok(Math.abs(nearEnd - 1) < 0.05, `near-end value ${nearEnd} close to settled 1`);
});

test('spring: custom stiffness/damping still pins endpoints', () => {
  const ease = spring({ 'damping': 10, 'mass': 2, 'stiffness': 80 });
  assert.strictEqual(ease(0), 0);
  assert.strictEqual(ease(1), 1);
});

test('chromaticDetourHue: warm-to-cool sweep crossing the dead zone routes through green at t=0.5', () => {
  // Red (10deg, warm) -> blue (240deg, cool). Direct shortestArc sweep runs
  // 10 -> 240 backward through 0/350..300..250 or forward through 60/90/150/200;
  // shortestArc picks whichever is shorter. Forward (10->240, +230) vs backward
  // (10->240 via negative, -130 i.e. 360-230=130) -- backward is shorter, which
  // sweeps 10 -> 350 -> ... -> 240, never touching 30-90. Use clockwise to force
  // the forward sweep through the dead zone.
  const mid = chromaticDetourHue(10, 240, 0.5, 'clockwise');
  assert.ok(mid >= 90 && mid <= 150, `midpoint hue ${mid} lands in the green band (90-150)`);
});

test('chromaticDetourHue: direct path outside the dead zone is unaffected', () => {
  // Blue (240) -> cyan (190): both cool, direct shortestArc sweep stays within cool hues.
  const mid = chromaticDetourHue(240, 190, 0.5, 'shortestArc');
  assert.ok(mid >= 180 && mid <= 250, `midpoint hue ${mid} stays in the direct cool-to-cool range`);
});

test('chromaticDetourHue: endpoints match the source and target hues', () => {
  const start = chromaticDetourHue(10, 240, 0, 'clockwise');
  const end   = chromaticDetourHue(10, 240, 1, 'clockwise');
  assert.ok(Math.abs(start - 10) < 1e-6, `start hue ${start} matches source`);
  assert.ok(Math.abs(end - 240) < 1e-6, `end hue ${end} matches target`);
});
