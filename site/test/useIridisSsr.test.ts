import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

import { IridisUiActionType } from '../app/composables/types/iridisUiEvent.ts';

register('./fixtures/NuxtImportsLoader.mjs', import.meta.url);

const TEST_NUXT_APP = Symbol.for('iridis.test.nuxt-app');

await test('useIridis boots a resolved palette during SSR without starting browser image work', async () => {
  const { useIridis } = await import('../app/composables/useIridis.ts');
  const state = useIridis();

  assert.equal(state.error.value, null);
  assert.equal(state.running.value, false);
  assert.equal(state.uploadedImages.value.length, 0);
  assert.equal(typeof state.roles.value.background, 'string');
  assert.equal(typeof state.roles.value.brand, 'string');
  assert.ok(state.sortedRoleContrastRows.value.length > 0);

  state.send({ 'cvdType': 'protanopia', 'type': IridisUiActionType.CVD_TOGGLE_PREVIEW });
  assert.equal(state.cvdPreviewTypes.value.has('protanopia'), true);
  state.send({ 'cvdType': 'unsupported-preview', 'type': IridisUiActionType.CVD_TOGGLE_PREVIEW });
  assert.deepEqual([...state.cvdPreviewTypes.value], ['protanopia']);
});

await test('useIridis shares one client context and isolates concurrent SSR request state', async (context) => {
  const { useIridis } = await import('../app/composables/useIridis.ts');
  const firstNuxtApp = {};
  const secondNuxtApp = {};
  context.after(() => { Reflect.deleteProperty(globalThis, TEST_NUXT_APP); });

  Reflect.set(globalThis, TEST_NUXT_APP, firstNuxtApp);
  const firstState = useIridis();
  const firstStateAgain = useIridis();
  assert.strictEqual(firstState.pickerSeeds, firstStateAgain.pickerSeeds);

  Reflect.set(globalThis, TEST_NUXT_APP, secondNuxtApp);
  const secondState = useIridis();
  assert.notStrictEqual(firstState.pickerSeeds, secondState.pickerSeeds);
  assert.notStrictEqual(firstState.roles, secondState.roles);

  firstState.pickerSeeds.value = [
    { 'hex': '#123456', 'role': undefined },
    { 'hex': '#abcdef', 'role': undefined }
  ];
  await Promise.all([
    Promise.resolve().then(() => {
      firstState.send({ 'mode': 'image', 'type': IridisUiActionType.SELECT_MODE });
    }),
    Promise.resolve().then(() => {
      secondState.send({ 'mode': 'picker', 'type': IridisUiActionType.SELECT_MODE });
    })
  ]);

  assert.deepEqual(secondState.pickerSeeds.value, [
    { 'hex': '#000000', 'role': undefined },
    { 'hex': '#ffffff', 'role': undefined }
  ]);
  assert.equal(firstState.mode.value, 'image');
  assert.equal(secondState.mode.value, 'picker');
});
