import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ContrastConfigFor } from '../app/composables/contrastConfigFor.ts';

await test('forStrictness always enables CVD correction for AA, AAA and APCA', () => {
  const aa = ContrastConfigFor.forStrictness(0);
  const aaa = ContrastConfigFor.forStrictness(1);
  const apca = ContrastConfigFor.forStrictness(2);

  assert.equal(aa.cvdCorrect, true);
  assert.equal(aa.level, 'AA');
  assert.equal(aaa.cvdCorrect, true);
  assert.equal(aaa.level, 'AAA');
  assert.equal(apca.cvdCorrect, true);
  assert.equal(apca.algorithm, 'apca');
});
