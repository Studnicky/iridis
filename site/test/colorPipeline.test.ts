import assert from 'node:assert/strict';
import { test } from 'node:test';

import { COLOR_PIPELINE } from '../app/composables/colorPipeline.ts';

await test('COLOR_PIPELINE runs one compliance enforcement stage and one compliance report and one withhold stage', () => {
  assert.deepEqual(COLOR_PIPELINE, [
    'intake:hexHint',
    'resolve:roles',
    'derive:roleRelations',
    'enforce:compliance',
    'derive:variant',
    'report:compliance',
    'withhold:compliance'
  ]);
});
