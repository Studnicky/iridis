import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PresentationControlsStore } from '../app/composables/presentationControls/PresentationControlsStore.ts';

class Fixture {
  static async publish(store: PresentationControlsStore, command: unknown): Promise<void> {
    await store.publishIntent(store.createIntent(command));
  }
}

await test('command admission rejects invalid payloads', () => {
  const store = PresentationControlsStore.create();
  const rejected: readonly unknown[] = [
    undefined,
    null,
    'theme.select',
    {},
    { 'interaction': 'unknown.interaction' },
    { 'interaction': 'theme.select' },
    { 'interaction': 'theme.select', 'themeKey': 'not-a-registered-theme' },
    { 'extra': true, 'interaction': 'theme.select', 'themeKey': 'gallery' },
    { 'interaction': 'role-sort.replace', 'roleSortKeys': [] },
    { 'interaction': 'role-sort.replace', 'roleSortKeys': [{ 'direction': 'sideways', 'field': 'hue' }] },
    { 'interaction': 'role-sort.replace', 'roleSortKeys': [{ 'direction': 'ascending', 'field': 'saturation' }] },
    { 'cvdPreviewType': 'monochromacy', 'interaction': 'cvd-preview.toggle' },
    { 'diagramExpanded': 'yes', 'interaction': 'diagram-view.set' },
    { 'interaction': 'navigation-target.set', 'navigationTarget': { 'targetId': '' } },
    { 'interaction': 'navigation-target.set', 'navigationTarget': {} }
  ];
  for (let index = 0; index < rejected.length; index += 1) {
    const candidate = rejected[index];
    assert.throws(() => {
      store.createIntent(candidate);
    }, Error, JSON.stringify(candidate));
  }
});

await test('publishIntent rejects an intent that did not come from createIntent admission', async () => {
  const store = PresentationControlsStore.create();
  const tampered = store.createIntent({ 'interaction': 'cvd-preview.clear' });
  Reflect.set(tampered.command, 'interaction', 'unknown.interaction');
  await assert.rejects(async () => {
    await store.publishIntent(tampered);
  });
  assert.equal(store.readModel().revision, 0);
});

await test('the initial read model carries the default theme and compliance-first sort', () => {
  const model = PresentationControlsStore.create().readModel();
  assert.equal(model.variant, 'ready');
  assert.equal(model.revision, 0);
  assert.equal(model.themeKey, 'futuristic');
  assert.deepEqual(model.cvdPreviewTypes, []);
  assert.equal(model.diagramExpanded, false);
  assert.deepEqual(model.roleSortKeys, [
    { 'direction': 'descending', 'field': 'compliance' },
    { 'direction': 'descending', 'field': 'ratio' }
  ]);
  assert.equal('navigationTarget' in model, false);
});

await test('theme selection updates the key and ignores a repeated selection', async () => {
  const store = PresentationControlsStore.create();
  await Fixture.publish(store, { 'interaction': 'theme.select', 'themeKey': 'gallery' });
  assert.equal(store.readModel().themeKey, 'gallery');
  assert.equal(store.readModel().revision, 1);
  await Fixture.publish(store, { 'interaction': 'theme.select', 'themeKey': 'gallery' });
  assert.equal(store.readModel().revision, 1);
});

await test('role sort replacement stores the keys in priority order', async () => {
  const store = PresentationControlsStore.create();
  await Fixture.publish(store, {
    'interaction': 'role-sort.replace',
    'roleSortKeys': [
      { 'direction': 'ascending', 'field': 'hue' },
      { 'direction': 'descending', 'field': 'name' }
    ]
  });
  assert.deepEqual(store.readModel().roleSortKeys, [
    { 'direction': 'ascending', 'field': 'hue' },
    { 'direction': 'descending', 'field': 'name' }
  ]);
});

await test('cvd preview toggles types in activation order and clears them', async () => {
  const store = PresentationControlsStore.create();
  await Fixture.publish(store, { 'cvdPreviewType': 'protanopia', 'interaction': 'cvd-preview.toggle' });
  await Fixture.publish(store, { 'cvdPreviewType': 'tritanopia', 'interaction': 'cvd-preview.toggle' });
  assert.deepEqual(store.readModel().cvdPreviewTypes, ['protanopia', 'tritanopia']);
  await Fixture.publish(store, { 'cvdPreviewType': 'protanopia', 'interaction': 'cvd-preview.toggle' });
  assert.deepEqual(store.readModel().cvdPreviewTypes, ['tritanopia']);
  await Fixture.publish(store, { 'interaction': 'cvd-preview.clear' });
  assert.deepEqual(store.readModel().cvdPreviewTypes, []);
  const revision = store.readModel().revision;
  await Fixture.publish(store, { 'interaction': 'cvd-preview.clear' });
  assert.equal(store.readModel().revision, revision);
});

await test('diagram view stores the expansion flag', async () => {
  const store = PresentationControlsStore.create();
  await Fixture.publish(store, { 'diagramExpanded': true, 'interaction': 'diagram-view.set' });
  assert.equal(store.readModel().diagramExpanded, true);
  await Fixture.publish(store, { 'diagramExpanded': false, 'interaction': 'diagram-view.set' });
  assert.equal(store.readModel().diagramExpanded, false);
});

await test('navigation target set records the target and invokes the registered effect handler', async () => {
  const store = PresentationControlsStore.create();
  const navigated: string[] = [];
  store.registerEffectHandlers({ 'navigateToTarget': (target) => { navigated.push(target.targetId); } });
  await Fixture.publish(store, { 'interaction': 'navigation-target.set', 'navigationTarget': { 'targetId': 'upload' } });
  await Fixture.publish(store, { 'interaction': 'navigation-target.set', 'navigationTarget': { 'targetId': 'upload' } });
  assert.deepEqual(store.readModel().navigationTarget, { 'targetId': 'upload' });
  assert.deepEqual(navigated, ['upload', 'upload']);
  assert.equal(store.readModel().revision, 2);
});

await test('a throwing effect handler does not reject the intent', async () => {
  const store = PresentationControlsStore.create();
  store.registerEffectHandlers({ 'navigateToTarget': () => { throw new Error('scroll failed'); } });
  await Fixture.publish(store, { 'interaction': 'navigation-target.set', 'navigationTarget': { 'targetId': 'cvd' } });
  assert.equal(store.readModel().navigationTarget?.targetId, 'cvd');
});

await test('subscribers receive each changed read model and stop after unsubscribe', async () => {
  const store = PresentationControlsStore.create();
  const received: string[] = [];
  const delivered = new Promise<void>((resolve) => {
    const unsubscribe = store.subscribe((model) => {
      received.push(model.themeKey);
      if (received.length === 2) {
        unsubscribe();
        resolve();
      }
    });
  });
  await Fixture.publish(store, { 'interaction': 'theme.select', 'themeKey': 'gallery' });
  await Fixture.publish(store, { 'interaction': 'theme.select', 'themeKey': 'gallery' });
  await Fixture.publish(store, { 'interaction': 'theme.select', 'themeKey': 'formal' });
  await delivered;
  await Fixture.publish(store, { 'interaction': 'theme.select', 'themeKey': 'arcade' });
  await store.dispose();
  assert.deepEqual(received, ['gallery', 'formal']);
});

await test('a disposed store rejects further intents', async () => {
  const store = PresentationControlsStore.create();
  await store.dispose();
  assert.throws(() => {
    store.createIntent({ 'interaction': 'cvd-preview.clear' });
  });
  await store.dispose();
});
