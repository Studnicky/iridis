import assert from 'node:assert/strict';
import { test } from 'node:test';

import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { RoleRecord } from '../../src/model/RoleRecord.ts';

void test('RoleRecord replaces role hints without changing canonical color coordinates', () => {
  const record = colorRecordFactory.fromHex('#7c3aed', {
    'hints': { 'intent': 'accent', 'role': 'seed', 'weight': 2 }
  });
  const result = RoleRecord.withHints(record, { 'intent': 'text' });

  assert.equal(result.hex, record.hex);
  assert.deepEqual(result.oklch, record.oklch);
  assert.deepEqual(result.rgb, record.rgb);
  assert.deepEqual(result.hints, { 'intent': 'text' });
});
