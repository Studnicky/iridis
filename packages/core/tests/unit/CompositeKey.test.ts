import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CompositeKey } from '../../src/model/CompositeKey.ts';

void test('composite key preserves ordered string boundaries', () => {
  const first = CompositeKey.of('a', 'bc');
  const second = CompositeKey.of('ab', 'c');
  const repeated = CompositeKey.of('a', 'bc');
  assert.notStrictEqual(first, second);
  assert.strictEqual(first, repeated);
  assert.notStrictEqual(
    CompositeKey.of('role', 'source\u0000target'),
    CompositeKey.of('role', 'source', 'target')
  );
});
