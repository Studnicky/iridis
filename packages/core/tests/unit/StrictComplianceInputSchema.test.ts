import assert from 'node:assert/strict';
import { test } from 'node:test';

import { InputSchema } from '../../src/model/InputSchema.ts';
import { Validator } from '../../src/model/Validator.ts';

void test('input schema accepts only a boolean strict-compliance toggle', () => {
  const validator = new Validator();
  const accepted = validator.validate(InputSchema, {
    'colors': [],
    'contrast': { 'enableStrictCompliance': true }
  });
  const rejected = validator.validate(InputSchema, {
    'colors': [],
    'contrast': { 'enableStrictCompliance': 'true' }
  });

  assert.strictEqual(accepted.errors.length, 0, 'the positive toggle is accepted as a boolean');
  assert.ok(rejected.errors.length > 0, 'a non-boolean strict toggle is rejected');
});
