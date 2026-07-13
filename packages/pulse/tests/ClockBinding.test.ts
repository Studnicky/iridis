import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ClockBinding } from '../src/ClockBinding.ts';

test('ClockBinding virtual: advance() deterministically steps t with no real timers', () => {
  const clock = ClockBinding.create({ 'durationMs': 1000, 'mode': 'virtual' });
  assert.strictEqual(clock.t, 0);

  clock.advance(250);
  assert.strictEqual(clock.t, 0.25);

  clock.advance(250);
  assert.strictEqual(clock.t, 0.5);

  clock.advance(250);
  assert.strictEqual(clock.t, 0.75);

  clock.advance(250);
  assert.strictEqual(clock.t, 1);
});

test('ClockBinding virtual: overshoot clamps t at 1', () => {
  const clock = ClockBinding.create({ 'durationMs': 1000, 'mode': 'virtual' });
  clock.advance(5000);
  assert.strictEqual(clock.t, 1);
});

test('ClockBinding real: advance() throws since real time cannot be driven manually', () => {
  const clock = ClockBinding.create({ 'durationMs': 1000, 'mode': 'real' });
  assert.throws(() => clock.advance(100));
});

test('ClockBinding real: t starts at (or very near) 0 and stays within [0, 1]', () => {
  const clock = ClockBinding.create({ 'durationMs': 1000, 'mode': 'real' });
  assert.ok(clock.t >= 0 && clock.t <= 1);
});
