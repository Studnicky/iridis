import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AliasColorEntity } from '../app/theme/entities/AliasColorEntity.ts';

await test('AliasColorEntity admits only the seven canonical Nuxt UI semantic colors', () => {
  assert.deepEqual(AliasColorEntity.Values, [
    'primary',
    'secondary',
    'success',
    'warning',
    'error',
    'info',
    'neutral'
  ]);
  assert.equal(AliasColorEntity.validate('primary'), true);
  assert.equal(AliasColorEntity.validate('brand'), false);
  assert.throws(() => {
    AliasColorEntity.intake('brand');
  });
});
