import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ContrastConfigFor } from '../app/composables/contrastConfigFor.ts';

await test('forStrictness always enables nudge CVD correction for AA, AAA and APCA', () => {
  const aa = ContrastConfigFor.forStrictness(0);
  const aaa = ContrastConfigFor.forStrictness(1);
  const apca = ContrastConfigFor.forStrictness(2);

  assert.equal(aa.cvdMode, 'nudge');
  assert.equal(aa.level, 'AA');
  assert.equal(aaa.cvdMode, 'nudge');
  assert.equal(aaa.level, 'AAA');
  assert.equal(apca.cvdMode, 'nudge');
  assert.equal(apca.algorithm, 'apca');
});
