import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PresentationControlsStore } from '../app/composables/presentationControls/PresentationControlsStore.ts';
import { PresentationPreferencesBridge } from '../app/composables/presentationControls/PresentationPreferencesBridge.ts';

class FakeStorage {
  public readonly values = new Map<string, string>();
  public writes = 0;

  public getItem(key: string): string | null {
    const value = this.values.get(key) ?? null;
    return value;
  }

  public setItem(key: string, value: string): void {
    this.writes += 1;
    this.values.set(key, value);
  }
}

class Eventually {
  static async holds(condition: () => boolean): Promise<void> {
    for (let attempt = 0; attempt < 50 && !condition(); attempt += 1) {
      await new Promise<void>((resolve) => { setImmediate(resolve); });
    }
    assert.ok(condition(), 'condition did not hold');
  }
}

const STORAGE_KEY = 'iridis-theme-preset';

await test('selecting a theme without an attached bridge never touches storage or the document', async () => {
  const storage = new FakeStorage();
  const element = { 'dataset': {} };
  const store = PresentationControlsStore.create();
  await store.publishIntent(store.createIntent({ 'interaction': 'theme.select', 'themeKey': 'gallery' }));
  await new Promise<void>((resolve) => { setImmediate(resolve); });
  assert.equal(storage.writes, 0);
  assert.deepEqual(element.dataset, {});
});

await test('attaching after mount hydrates the stored theme and applies it to the document', async () => {
  const storage = new FakeStorage();
  storage.values.set(STORAGE_KEY, 'gallery');
  const element = { 'dataset': {} as DOMStringMap };
  const store = PresentationControlsStore.create();
  const bridge = await PresentationPreferencesBridge.attachAfterMount(store, { 'element': element, 'storage': storage });
  assert.equal(store.readModel().themeKey, 'gallery');
  assert.equal(element.dataset.iridisTheme, 'gallery');
  assert.equal(storage.writes, 0);
  bridge.dispose();
});

await test('theme selections made after attach persist to storage and the document', async () => {
  const storage = new FakeStorage();
  const element = { 'dataset': {} as DOMStringMap };
  const store = PresentationControlsStore.create();
  const bridge = await PresentationPreferencesBridge.attachAfterMount(store, { 'element': element, 'storage': storage });
  await store.publishIntent(store.createIntent({ 'interaction': 'theme.select', 'themeKey': 'formal' }));
  await Eventually.holds(() => {
    const stored = storage.values.get(STORAGE_KEY);
    const matches = stored === 'formal';
    return matches;
  });
  assert.equal(element.dataset.iridisTheme, 'formal');
  bridge.dispose();
  await store.publishIntent(store.createIntent({ 'interaction': 'theme.select', 'themeKey': 'arcade' }));
  await new Promise<void>((resolve) => { setImmediate(resolve); });
  assert.equal(storage.values.get(STORAGE_KEY), 'formal');
});

await test('an unregistered stored theme is ignored', async () => {
  const storage = new FakeStorage();
  storage.values.set(STORAGE_KEY, 'removed-theme');
  const element = { 'dataset': {} as DOMStringMap };
  const store = PresentationControlsStore.create();
  const bridge = await PresentationPreferencesBridge.attachAfterMount(store, { 'element': element, 'storage': storage });
  assert.equal(store.readModel().themeKey, 'futuristic');
  assert.equal(element.dataset.iridisTheme, 'futuristic');
  bridge.dispose();
});

await test('applyStoredTheme writes only the document attribute', () => {
  const storage = new FakeStorage();
  storage.values.set(STORAGE_KEY, 'hackerman');
  const element = { 'dataset': {} as DOMStringMap };
  PresentationPreferencesBridge.applyStoredTheme({ 'element': element, 'storage': storage });
  assert.equal(element.dataset.iridisTheme, 'hackerman');
  assert.equal(storage.writes, 0);
});
