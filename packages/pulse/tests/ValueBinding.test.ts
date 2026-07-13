import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ValueBinding } from '../src/ValueBinding.ts';

test('ValueBinding: in-range values map linearly, midpoint is 0.5', () => {
  const binding = ValueBinding.create({ 'max': 500, 'min': 0 });
  assert.strictEqual(binding.mapToT(0), 0);
  assert.strictEqual(binding.mapToT(500), 1);
  assert.strictEqual(binding.mapToT(250), 0.5);
});

test('ValueBinding: clamp defaults to true, clamping out-of-range input to [0, 1]', () => {
  const binding = ValueBinding.create({ 'max': 500, 'min': 0 });
  assert.strictEqual(binding.mapToT(-100), 0);
  assert.strictEqual(binding.mapToT(600), 1);
});

test('ValueBinding: clamp: false extrapolates linearly beyond [0, 1]', () => {
  const binding = ValueBinding.create({ 'clamp': false, 'max': 500, 'min': 0 });
  assert.strictEqual(binding.mapToT(-100), -0.2);
  assert.strictEqual(binding.mapToT(600), 1.2);
});
