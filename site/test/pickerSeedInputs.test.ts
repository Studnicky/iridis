import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pickerSeedInputs } from '../app/composables/pickerSeedInputs.ts';

await test('pickerSeedInputs emits unpinned seeds as JSON-safe hex strings', () => {
  assert.deepEqual(
    pickerSeedInputs([{ 'hex': '#123456', 'role': undefined }]),
    ['#123456']
  );
});

await test('pickerSeedInputs preserves pinned role hints without undefined fields', () => {
  assert.deepEqual(
    pickerSeedInputs([
      { 'hex': '#123456', 'role': undefined },
      { 'hex': '#abcdef', 'role': 'brand' }
    ]),
    ['#123456', { 'hex': '#abcdef', 'role': 'brand' }]
  );
});
