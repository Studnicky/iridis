import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';

import { PaletteSessionStore } from '../app/composables/paletteSession/PaletteSessionStore.ts';
import { PaletteSessionFakeProvider } from './fixtures/PaletteSessionFakeProvider.ts';

class StoreHarness {
  public readonly provider = new PaletteSessionFakeProvider();
  public readonly store = new PaletteSessionStore(this.provider);

  public issue(command: unknown): void {
    this.store.publishIntent(this.store.createIntent(command));
  }
}

await test('commands issued in one tick produce one request per settled revision', async () => {
  const harness = new StoreHarness();
  await setImmediate();
  assert.equal(harness.provider.client.paletteRequests().length, 1);
  harness.provider.client.answer(0);
  await harness.store.settled();
  harness.issue({ 'interaction': 'palette.seed.add', 'payload': { 'hex': '#336699' } });
  harness.issue({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } });
  harness.issue({ 'interaction': 'palette.schema.select', 'payload': { 'schemaName': 'iridis-8' } });
  harness.issue({ 'interaction': 'palette.cvd-mode.select', 'payload': { 'cvdMode': 'enforce' } });
  harness.issue({ 'interaction': 'palette.strict-compliance.select', 'payload': { 'enableStrictCompliance': true } });
  await setImmediate();
  const requests = harness.provider.client.paletteRequests();
  assert.equal(requests.length, 2);
  const last = requests[1];
  assert.equal(last?.kind, 'palette');
  if (last?.kind === 'palette') {
    assert.equal(last.request.framing, 'light');
    assert.equal(last.request.schemaName, 'iridis-8');
    assert.equal(last.request.cvdMode, 'enforce');
    assert.equal(last.request.enableStrictCompliance, true);
    assert.equal(last.request.seeds.length, 3);
  }
  assert.equal(harness.store.readModel().revision, 5);
  assert.equal(harness.store.readModel().status, 'resolving');
});

await test('a stale reply never publishes', async () => {
  const harness = new StoreHarness();
  await setImmediate();
  harness.provider.client.answer(0);
  await harness.store.settled();
  const initialResolved = harness.store.readModel().resolved;
  assert.equal(initialResolved?.revision, 0);
  harness.issue({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } });
  await setImmediate();
  harness.issue({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'dark' } });
  harness.issue({ 'interaction': 'palette.schema.select', 'payload': { 'schemaName': 'iridis-8' } });
  await setImmediate();
  assert.equal(harness.provider.client.paletteRequests().length, 3);
  harness.provider.client.answer(1);
  await setImmediate();
  assert.equal(harness.store.readModel().status, 'resolving');
  assert.equal(harness.store.readModel().resolved?.revision, 0);
  harness.provider.client.answer(2);
  await harness.store.settled();
  const model = harness.store.readModel();
  assert.equal(model.status, 'idle');
  assert.equal(model.resolved?.revision, 3);
  assert.equal(model.resolved?.correlationId, 'intent-3');
  assert.equal(model.resolved?.framing, 'dark');
});

await test('an intent that leaves the resolution input unchanged dispatches nothing', async () => {
  const harness = new StoreHarness();
  await setImmediate();
  harness.provider.client.answer(0);
  await harness.store.settled();
  harness.issue({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'dark' } });
  await setImmediate();
  assert.equal(harness.provider.client.paletteRequests().length, 1);
  assert.equal(harness.store.readModel().revision, 1);
  assert.equal(harness.store.readModel().status, 'idle');
});

await test('an envelope must carry the next revision and invalid commands are never stamped', async () => {
  const harness = new StoreHarness();
  const first = harness.store.createIntent({ 'interaction': 'palette.seed.add', 'payload': { 'hex': '#336699' } });
  const second = harness.store.createIntent({ 'interaction': 'palette.seed.add', 'payload': { 'hex': '#996633' } });
  assert.equal(first.revision, 1);
  assert.equal(first.correlationId, 'intent-1');
  harness.store.publishIntent(first);
  assert.throws(() => { harness.store.publishIntent(second); }, RangeError);
  assert.throws(() => { harness.store.createIntent({ 'interaction': 'palette.seed.add', 'payload': { 'hex': 'nope' } }); });
  assert.equal(harness.store.readModel().revision, 1);
  await harness.store.dispose();
});

await test('subscribers receive the read model after each change', async () => {
  const harness = new StoreHarness();
  const seen: string[] = [];
  const unsubscribe = harness.store.subscribe((model) => { seen.push(`${String(model.revision)}:${model.status}`); });
  await setImmediate();
  harness.provider.client.answer(0);
  await harness.store.settled();
  harness.issue({ 'interaction': 'palette.seed.add', 'payload': { 'hex': '#336699' } });
  await setImmediate();
  harness.provider.client.answer(1);
  await harness.store.settled();
  unsubscribe();
  const received = [...seen];
  harness.issue({ 'interaction': 'palette.seed.add', 'payload': { 'hex': '#663399' } });
  await setImmediate();
  harness.provider.client.answer(2);
  await harness.store.settled();
  assert.deepEqual(seen, received);
  assert.deepEqual(received, ['0:idle', '1:resolving', '1:idle']);
});

await test('a failed resolution is reported and a later revision resolves again', async () => {
  const harness = new StoreHarness();
  await setImmediate();
  const first = harness.provider.client.requests[0];
  assert.ok(first !== undefined);
  harness.provider.handlers?.idle(first);
  harness.provider.handlers?.reject('engine fault');
  await harness.store.settled();
  assert.equal(harness.store.readModel().status, 'failed');
  assert.equal(harness.store.readModel().error, 'engine fault');
  harness.issue({ 'interaction': 'palette.seed.add', 'payload': { 'hex': '#336699' } });
  await setImmediate();
  harness.provider.client.answer(1);
  await harness.store.settled();
  assert.equal(harness.store.readModel().status, 'idle');
  assert.equal(harness.store.readModel().error, undefined);
});
