import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

import { IridisUiEvent } from '../app/composables/types/iridisUiEvent.ts';
import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';

registerHooks(NuxtImportsLoader);

await test('useIridis boots a resolved palette during SSR without starting browser image work', async () => {
  const { useIridis } = await import('../app/composables/useIridis.ts');
  const state = useIridis();

  assert.equal(state.error.value, null);
  assert.equal(state.running.value, false);
  assert.equal(state.uploadedImages.value.length, 0);
  assert.equal(typeof state.roles.value.background, 'string');
  assert.equal(typeof state.roles.value.brand, 'string');
  assert.ok(state.roleContrastRows.value.length > 0);

});

await test('useIridis shares one client context and isolates concurrent SSR request state', async (context) => {
  const { useIridis } = await import('../app/composables/useIridis.ts');
  const firstNuxtApp = {};
  const secondNuxtApp = {};
  context.after(() => { Reflect.set(globalThis, 'iridisTestNuxtApp', undefined); });

  Reflect.set(globalThis, 'iridisTestNuxtApp', firstNuxtApp);
  const firstState = useIridis();
  const firstStateAgain = useIridis();
  assert.strictEqual(firstState.pickerSeeds, firstStateAgain.pickerSeeds);

  Reflect.set(globalThis, 'iridisTestNuxtApp', secondNuxtApp);
  const secondState = useIridis();
  assert.notStrictEqual(firstState.pickerSeeds, secondState.pickerSeeds);
  assert.notStrictEqual(firstState.roles, secondState.roles);

  firstState.pickerSeeds.value = [
    { 'hex': '#123456', 'role': undefined },
    { 'hex': '#abcdef', 'role': undefined }
  ];
  await Promise.all([
    Promise.resolve().then(() => {
      firstState.send(IridisUiEvent.selectImageMode());
    }),
    Promise.resolve().then(() => {
      secondState.send(IridisUiEvent.selectPickerMode());
    })
  ]);

  assert.deepEqual(secondState.pickerSeeds.value, [
    { 'hex': '#000000', 'role': undefined },
    { 'hex': '#ffffff', 'role': undefined }
  ]);
  assert.equal(firstState.mode.value, 'image');
  assert.equal(secondState.mode.value, 'picker');
});
