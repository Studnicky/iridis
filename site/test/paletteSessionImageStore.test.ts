import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';

import type { PaletteSessionFakeClient } from './fixtures/PaletteSessionFakeClient.ts';

import { PaletteSessionInput } from '../app/composables/paletteSession/PaletteSessionInput.ts';
import { PaletteSessionStore } from '../app/composables/paletteSession/PaletteSessionStore.ts';
import { PaletteSessionFakeProvider } from './fixtures/PaletteSessionFakeProvider.ts';
import { PaletteSessionImageFixture } from './fixtures/PaletteSessionImageFixture.ts';


class ImageStoreHarness {
  public readonly provider = new PaletteSessionFakeProvider();
  public readonly store = new PaletteSessionStore(this.provider);

  public get client(): PaletteSessionFakeClient {
    const result = this.provider.client;
    return result;
  }

  public static async started(): Promise<ImageStoreHarness> {
    const harness = new ImageStoreHarness();
    await setImmediate();
    harness.client.answer(0);
    await harness.store.settled();
    return harness;
  }

  public async addExtracted(imageId: string): Promise<void> {
    this.issue({ 'interaction': 'palette.image.entry.add', 'payload': { 'imageId': imageId, 'name': `${imageId}.png`, 'source': `blob:${imageId}` } });
    this.client.answerExtract(
      this.lastIndex('extract'),
      PaletteSessionImageFixture.extraction(PaletteSessionImageFixture.lopsided(), [PaletteSessionImageFixture.candidate('k-means', [{ 'hex': '#0000ff', 'weight': 1 }])])
    );
    await setImmediate();
  }

  public issue(command: unknown): void {
    this.store.publishIntent(this.store.createIntent(command));
  }

  public lastIndex(kind: string): number {
    const indexes = this.client.indexesOf(kind);
    const result = indexes[indexes.length - 1] ?? -1;
    return result;
  }
}

await test('pixels reach the worker before the entry extracts, and the extract reply settles the entry', async () => {
  const harness = await ImageStoreHarness.started();
  await harness.store.loadPixels('img-1', 2, 2, new ArrayBuffer(16));
  assert.equal(harness.client.indexesOf('pixels').length, 1);
  assert.equal(harness.client.pixels.length, 1);
  harness.issue({ 'interaction': 'palette.image.entry.add', 'payload': { 'imageId': 'img-1', 'name': 'a.png', 'source': 'blob:a' } });
  assert.equal(harness.client.indexesOf('extract').length, 1);
  assert.equal(harness.store.readModel().image.entries[0]?.status, 'extracting');
  await harness.store.dispose();
});

await test('an extract reply triggers one combine built from the session entries, whose reply feeds the read model', async () => {
  const harness = await ImageStoreHarness.started();
  await harness.addExtracted('img-1');
  const combines = harness.client.indexesOf('combine');
  assert.equal(combines.length, 1);
  const message = harness.client.requests[combines[0] ?? -1];
  assert.equal(message?.kind, 'combine');
  if (message?.kind === 'combine') {
    assert.equal(message.hexes.length, 1000);
    assert.equal(message.hexes.filter((hex) => {
      const matches = hex === '#aa0000';
      return matches;
    }).length, 750);
    assert.equal(message.settings.k, harness.store.readModel().input.imageTuning.k);
  }
  assert.equal(harness.store.readModel().image.combine.status, 'combining');
  const candidate = PaletteSessionImageFixture.candidate('k-means', [{ 'hex': '#0000ff', 'weight': 1 }]);
  harness.client.answerCombine(combines[0] ?? -1, { 'candidates': [candidate], 'extracted': ['#aa0000', '#00aa00'], 'histogram': PaletteSessionImageFixture.lopsided() });
  await setImmediate();
  const model = harness.store.readModel();
  assert.deepEqual(model.image.histogram, PaletteSessionImageFixture.lopsided());
  assert.equal(model.image.candidates.length, 1);
  assert.equal(model.image.combine.status, 'idle');
  assert.equal(model.image.entries[0]?.status, 'idle');
  assert.deepEqual(model.input.pickerSeeds, [{ 'hex': '#aa0000' }, { 'hex': '#00aa00' }]);
  assert.deepEqual(model.input.imageSeeds, [{ 'hex': '#aa0000' }, { 'hex': '#00aa00' }]);
  await harness.store.dispose();
});

await test('a combine reply that a newer combine request superseded is ignored', async () => {
  const harness = await ImageStoreHarness.started();
  await harness.addExtracted('img-1');
  const first = harness.lastIndex('combine');
  harness.issue({ 'interaction': 'palette.image.entry.candidate.select', 'payload': { 'imageId': 'img-1', 'label': 'k-means' } });
  const second = harness.lastIndex('combine');
  assert.notEqual(first, second);
  harness.client.answerCombine(first, { 'candidates': [], 'extracted': ['#111111'], 'histogram': [] });
  await setImmediate();
  assert.deepEqual(harness.store.readModel().input.pickerSeeds, PaletteSessionImageFixture.defaultSeeds());
  harness.client.answerCombine(second, { 'candidates': [], 'extracted': ['#222222'], 'histogram': [] });
  await setImmediate();
  assert.deepEqual(harness.store.readModel().input.pickerSeeds, [{ 'hex': '#222222' }]);
  await harness.store.dispose();
});

await test('a superseded extract request leaves the entry extracting until the newer reply lands', async () => {
  const harness = await ImageStoreHarness.started();
  harness.issue({ 'interaction': 'palette.image.entry.add', 'payload': { 'imageId': 'img-1', 'name': 'a.png', 'source': 'blob:a' } });
  const tuning = harness.store.readModel().input.imageTuning;
  harness.issue({ 'interaction': 'palette.image.entry.settings.set', 'payload': { 'imageId': 'img-1', 'settings': { ...tuning, 'k': 4 } } });
  const [older, newer] = harness.client.indexesOf('extract');
  harness.client.supersede(older ?? -1);
  await setImmediate();
  assert.equal(harness.store.readModel().image.entries[0]?.status, 'extracting');
  harness.client.answerExtract(newer ?? -1, PaletteSessionImageFixture.extraction(PaletteSessionImageFixture.lopsided(), []));
  await setImmediate();
  assert.equal(harness.store.readModel().image.entries[0]?.status, 'idle');
  assert.equal(harness.store.readModel().image.entries[0]?.settings.k, 4);
  await harness.store.dispose();
});

await test('the combine lock holds back automatic combines and an explicit request still runs', async () => {
  const harness = await ImageStoreHarness.started();
  harness.issue({ 'interaction': 'palette.image.combine.lock.select', 'payload': { 'enableCombineLock': true } });
  await harness.addExtracted('img-1');
  assert.equal(harness.client.indexesOf('combine').length, 0);
  harness.issue({ 'interaction': 'palette.image.combine.request', 'payload': {} });
  assert.equal(harness.client.indexesOf('combine').length, 1);
  assert.equal(harness.store.readModel().image.combine.status, 'combining');
  await harness.store.dispose();
});

await test('lane failures attach to the lane that went idle and clear when the lane recovers', async () => {
  const harness = await ImageStoreHarness.started();
  harness.issue({ 'interaction': 'palette.image.entry.add', 'payload': { 'imageId': 'img-1', 'name': 'a.png', 'source': 'blob:a' } });
  const extract = harness.client.requests[harness.lastIndex('extract')];
  assert.ok(extract !== undefined);
  harness.provider.handlers?.idle(extract);
  harness.provider.handlers?.reject('extract fault');
  const failed = harness.store.readModel().image.entries[0];
  assert.equal(failed?.status, 'failed');
  assert.equal(failed?.error, 'extract fault');
  assert.equal(harness.store.readModel().error, undefined);
  const tuning = harness.store.readModel().input.imageTuning;
  harness.issue({ 'interaction': 'palette.image.entry.settings.set', 'payload': { 'imageId': 'img-1', 'settings': tuning } });
  harness.client.answerExtract(harness.lastIndex('extract'), PaletteSessionImageFixture.extraction(PaletteSessionImageFixture.lopsided(), []));
  await setImmediate();
  const recovered = harness.store.readModel().image.entries[0];
  assert.equal(recovered?.status, 'idle');
  assert.equal(recovered?.error, undefined);
  const combine = harness.client.requests[harness.lastIndex('combine')];
  assert.ok(combine !== undefined);
  harness.provider.handlers?.idle(combine);
  harness.provider.handlers?.reject('combine fault');
  assert.deepEqual(harness.store.readModel().image.combine, { 'error': 'combine fault', 'status': 'failed' });
  assert.equal(harness.store.readModel().image.entries[0]?.status, 'idle');
  harness.issue({ 'interaction': 'palette.image.combine.request', 'payload': {} });
  harness.client.answerCombine(harness.lastIndex('combine'), { 'candidates': [], 'extracted': ['#aa0000'], 'histogram': PaletteSessionImageFixture.lopsided() });
  await setImmediate();
  assert.deepEqual(harness.store.readModel().image.combine, { 'status': 'idle' });
  await harness.store.dispose();
});

await test('removing the last entry releases its pixels and restores the default seeds without a combine request', async () => {
  const harness = await ImageStoreHarness.started();
  await harness.addExtracted('img-1');
  harness.client.answerCombine(harness.lastIndex('combine'), { 'candidates': [], 'extracted': ['#aa0000'], 'histogram': PaletteSessionImageFixture.lopsided() });
  await setImmediate();
  const combinesBefore = harness.client.indexesOf('combine').length;
  harness.issue({ 'interaction': 'palette.image.entry.remove', 'payload': { 'imageId': 'img-1' } });
  await setImmediate();
  assert.equal(harness.client.indexesOf('release').length, 1);
  assert.equal(harness.client.indexesOf('combine').length, combinesBefore);
  const model = harness.store.readModel();
  assert.equal(model.image.entries.length, 0);
  assert.deepEqual(model.image.histogram, []);
  assert.deepEqual(model.input.pickerSeeds, PaletteSessionImageFixture.defaultSeeds());
  await harness.store.dispose();
});

await test('a mode switch that changes the resolving seeds requests one palette resolution per tick', async () => {
  const harness = await ImageStoreHarness.started();
  harness.issue({ 'interaction': 'palette.seed.add', 'payload': { 'hex': '#336699' } });
  harness.issue({ 'interaction': 'palette.mode.select', 'payload': { 'mode': 'image' } });
  harness.issue({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } });
  await setImmediate();
  const requests = harness.client.paletteRequests();
  assert.equal(requests.length, 2);
  const last = requests[1];
  assert.equal(last?.kind, 'palette');
  if (last?.kind === 'palette') {
    assert.equal(last.request.seeds.length, 2);
  }
  assert.equal(harness.store.readModel().input.mode, 'image');
  assert.equal(PaletteSessionInput.activeSeeds(harness.store.readModel().input).length, 2);
  await harness.store.dispose();
});

await test('image commands that fail admission are never stamped', async () => {
  const harness = await ImageStoreHarness.started();
  const revision = harness.store.readModel().revision;
  assert.throws(() => { harness.store.createIntent({ 'interaction': 'palette.image.combine.request', 'payload': { 'hexes': ['#112233'] } }); });
  assert.throws(() => { harness.store.createIntent({ 'interaction': 'palette.image.entry.remove', 'payload': { 'imageId': '' } }); });
  assert.equal(harness.store.readModel().revision, revision);
  await harness.store.dispose();
});
