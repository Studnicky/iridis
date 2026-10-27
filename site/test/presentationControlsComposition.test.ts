import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PresentationControlsComposition } from '../app/composables/presentationControls/PresentationControlsComposition.ts';

await test('one Nuxt app resolves one composition and two apps do not share state', async () => {
  const firstApp = {};
  const secondApp = {};
  const first = PresentationControlsComposition.resolve(firstApp);
  const second = PresentationControlsComposition.resolve(secondApp);

  assert.equal(PresentationControlsComposition.resolve(firstApp) === first, true);
  assert.equal(first === second, false);
  assert.equal(first.store === second.store, false);

  await first.dispatch({ 'interaction': 'theme.select', 'themeKey': 'gallery' });
  await first.dispatch({ 'cvdPreviewType': 'protanopia', 'interaction': 'cvd-preview.toggle' });

  assert.equal(first.readModel.value.themeKey, 'gallery');
  assert.deepEqual(first.readModel.value.cvdPreviewTypes, ['protanopia']);
  assert.equal(second.readModel.value.themeKey, 'futuristic');
  assert.deepEqual(second.readModel.value.cvdPreviewTypes, []);
  assert.equal(second.store.readModel().revision, 0);
});

await test('the reactive read model follows the store', async () => {
  const composition = PresentationControlsComposition.resolve({});
  const before = composition.readModel.value;
  await composition.dispatch({ 'diagramExpanded': true, 'interaction': 'diagram-view.set' });
  assert.equal(composition.readModel.value === before, false);
  assert.equal(composition.readModel.value.diagramExpanded, true);
});

await test('dispatch logs and drops an invalid command without changing state', async () => {
  const composition = PresentationControlsComposition.resolve({});
  await composition.dispatch({ 'interaction': 'theme.select', 'themeKey': 'nope' });
  assert.equal(composition.readModel.value.revision, 0);
  assert.equal(composition.readModel.value.themeKey, 'futuristic');
});
