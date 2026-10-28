import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

import type { WorkerHandlersInterface } from '../app/composables/interfaces/WorkerHandlersInterface.ts';
import type { PaletteResolutionClientInterface } from '../app/composables/paletteSession/interfaces/PaletteResolutionClientInterface.ts';
import type { PaletteResolutionClientProviderInterface } from '../app/composables/paletteSession/interfaces/PaletteResolutionClientProviderInterface.ts';

import { PaletteSessionVueComposition } from '../app/composables/paletteSession/PaletteSessionVueComposition.ts';
import { WorkerRequestClient } from '../app/composables/workerRequestClient.ts';
import { LoopbackWorkerPort } from './fixtures/LoopbackWorkerPort.ts';
import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';
import { RdfRunIdentifier } from './fixtures/RdfRunIdentifier.ts';

registerHooks(NuxtImportsLoader);

class LoopbackProvider implements PaletteResolutionClientProviderInterface {
  public open(handlers: WorkerHandlersInterface): PaletteResolutionClientInterface {
    const result = new WorkerRequestClient(new LoopbackWorkerPort(), handlers);
    return result;
  }
}

class CompositionHarness {
  static readonly commands = [
    { 'interaction': 'palette.schema.select', 'payload': { 'schemaName': 'iridis-8' } },
    { 'interaction': 'palette.seed.set', 'payload': { 'hex': '#7c3aed', 'index': 0 } },
    { 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 0, 'role': 'brand' } },
    { 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } }
  ];

  static readonly withholding = [
    { 'interaction': 'palette.contrast.strictness.select', 'payload': { 'strictness': 1 } },
    { 'interaction': 'palette.non-mandatory-level.select', 'payload': { 'nonMandatoryLevel': 'AAA' } },
    { 'interaction': 'palette.cvd-mode.select', 'payload': { 'cvdMode': 'enforce' } }
  ];
}

await test('one app resolves one composition and two apps do not share a session', async () => {
  const firstApp = {};
  const secondApp = {};
  const first = PaletteSessionVueComposition.resolve(firstApp);
  const second = PaletteSessionVueComposition.resolve(secondApp);
  assert.equal(PaletteSessionVueComposition.resolve(firstApp) === first, true);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.store, second.store);
  await first.dispatch({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } });
  assert.equal(first.readModel.value.input.framing, 'light');
  assert.equal(second.readModel.value.input.framing, 'dark');
  assert.equal(second.readModel.value.revision, 0);
  await Promise.all([first.dispose(), second.dispose()]);
});

await test('the reactive read model follows the store through its subscription', async () => {
  const composition = PaletteSessionVueComposition.resolve({});
  await composition.store.settled();
  const before = composition.readModel.value;
  assert.equal(before.status, 'idle');
  assert.ok(before.resolved !== undefined);
  composition.store.publishIntent(composition.store.createIntent({ 'interaction': 'palette.cvd-mode.select', 'payload': { 'cvdMode': 'warn' } }));
  await composition.store.settled();
  assert.notStrictEqual(composition.readModel.value, before);
  assert.equal(composition.readModel.value.input.cvdMode, 'warn');
  assert.equal(composition.readModel.value === composition.store.readModel(), true);
  await composition.dispose();
});

await test('dispatch admits a command and publishes the next revision with a resolved palette', async () => {
  const composition = PaletteSessionVueComposition.resolve({});
  await composition.store.settled();
  const revision = composition.readModel.value.revision;
  await composition.dispatch({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } });
  assert.equal(composition.readModel.value.revision, revision + 1);
  assert.equal(composition.readModel.value.status, 'idle');
  assert.equal(composition.readModel.value.resolved?.framing, 'light');
  await composition.dispose();
});

await test('dispatch logs and drops a rejected command without changing the session', async () => {
  const composition = PaletteSessionVueComposition.resolve({});
  await composition.store.settled();
  const before = composition.readModel.value;
  await composition.dispatch({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'dim' } });
  await composition.dispatch({ 'interaction': 'palette.seed.remove', 'payload': { 'index': 9 } });
  assert.equal(composition.readModel.value === before, true);
  assert.equal(composition.readModel.value.revision, 0);
  await composition.dispatch({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } });
  assert.equal(composition.readModel.value.revision, 1);
  await composition.dispose();
});

await test('status, running, resolving, error, and paletteRevision derive from the read model', async () => {
  const composition = PaletteSessionVueComposition.resolve({});
  assert.equal(composition.resolving.value, true);
  assert.equal(composition.running.value, true);
  assert.equal(composition.paletteRevision.value, 0);
  await composition.store.settled();
  assert.deepEqual(composition.status.value, { 'error': null, 'resolving': false, 'running': false });
  assert.equal(composition.error.value, null);
  assert.equal(composition.resolving.value, false);
  assert.equal(composition.running.value, false);
  assert.equal(composition.paletteRevision.value, 0);
  await composition.dispatch({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } });
  assert.equal(composition.paletteRevision.value, 1);
  await composition.dispose();
});

await test('a withheld run publishes its blockers while the last admitted palette and revision stay', async () => {
  const composition = PaletteSessionVueComposition.resolve({});
  for (let index = 0; index < CompositionHarness.withholding.length; index += 1) {
    await composition.dispatch(CompositionHarness.withholding[index]);
  }
  const admitted = composition.readModel.value;
  assert.equal(admitted.withheld, false);
  assert.ok(admitted.blockers.pairs.length > 0);
  assert.equal(admitted.blockers.withheld, false);
  const admittedRevision = composition.paletteRevision.value;
  assert.equal(admittedRevision, admitted.revision);
  await composition.dispatch({ 'interaction': 'palette.strict-compliance.select', 'payload': { 'enableStrictCompliance': true } });
  const withheld = composition.readModel.value;
  assert.equal(withheld.withheld, true);
  assert.equal(withheld.blockers.withheld, true);
  assert.ok(withheld.blockers.pairs.length > 0);
  assert.equal(withheld.revision, admittedRevision + 1);
  assert.equal(composition.paletteRevision.value, admittedRevision);
  assert.deepEqual(withheld.resolved?.snapshot, admitted.resolved?.snapshot);
  await composition.dispose();
});

await test('a compliant run publishes an empty blocker set', async () => {
  const composition = PaletteSessionVueComposition.resolve({});
  await composition.store.settled();
  assert.equal(composition.readModel.value.blockers.compliant, true);
  assert.equal(composition.readModel.value.blockers.withheld, false);
  await composition.dispose();
});

await test('dispose stops the subscription, releases the session, and lets the app resolve a fresh one', async () => {
  const app = {};
  const composition = PaletteSessionVueComposition.resolve(app);
  await composition.store.settled();
  const frozen = composition.readModel.value;
  await composition.dispose();
  assert.throws(() => { composition.store.createIntent({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } }); }, { 'message': 'The palette session is disposed' });
  assert.equal(composition.readModel.value === frozen, true);
  const fresh = PaletteSessionVueComposition.resolve(app);
  assert.notStrictEqual(fresh, composition);
  assert.notStrictEqual(fresh.store, composition.store);
  await fresh.dispose();
});

await test('the in-process server path yields the same read model as the worker-style path', async () => {
  const server = PaletteSessionVueComposition.resolve({});
  const worker = PaletteSessionVueComposition.resolve({}, new LoopbackProvider());
  await Promise.all([server.store.settled(), worker.store.settled()]);
  for (let index = 0; index < CompositionHarness.commands.length; index += 1) {
    await Promise.all([server.dispatch(CompositionHarness.commands[index]), worker.dispatch(CompositionHarness.commands[index])]);
  }
  assert.equal(server.readModel.value.status, 'idle');
  assert.ok(server.readModel.value.resolved !== undefined);
  assert.equal(RdfRunIdentifier.mask(JSON.stringify(server.readModel.value)), RdfRunIdentifier.mask(JSON.stringify(worker.readModel.value)));
  assert.deepEqual(server.status.value, worker.status.value);
  assert.equal(server.paletteRevision.value, worker.paletteRevision.value);
  await Promise.all([server.dispose(), worker.dispose()]);
});

await test('usePaletteSession resolves the composition of the current Nuxt app', async (context) => {
  const { usePaletteSession } = await import('../app/composables/usePaletteSession.ts');
  const firstApp = {};
  const secondApp = {};
  context.after(() => { Reflect.set(globalThis, 'iridisTestNuxtApp', undefined); });
  Reflect.set(globalThis, 'iridisTestNuxtApp', firstApp);
  const first = usePaletteSession();
  assert.equal(usePaletteSession() === first, true);
  Reflect.set(globalThis, 'iridisTestNuxtApp', secondApp);
  const second = usePaletteSession();
  assert.notStrictEqual(second, first);
  assert.equal(PaletteSessionVueComposition.resolve(firstApp) === first, true);
  await Promise.all([first.dispose(), second.dispose()]);
});
