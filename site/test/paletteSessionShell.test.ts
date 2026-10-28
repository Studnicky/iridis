import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';

import type { PaletteSnapshotEntity } from '../app/composables/entities/PaletteSnapshotEntity.ts';

import { PaletteSessionRoleViews } from '../app/composables/paletteSession/PaletteSessionRoleViews.ts';
import { PaletteSessionSnapshotSlot } from '../app/composables/paletteSession/PaletteSessionSnapshotSlot.ts';
import { PaletteSessionVueComposition } from '../app/composables/paletteSession/PaletteSessionVueComposition.ts';
import { FakeBrowserEnvironment } from './fixtures/FakeBrowserEnvironment.ts';
import { FakeEngineWorker } from './fixtures/FakeEngineWorker.ts';
import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';

registerHooks(NuxtImportsLoader);

class MemorySlot {
  public snapshot: PaletteSnapshotEntity.Type | null = null;
  public readonly slot = new PaletteSessionSnapshotSlot(
    () => {
      const current = this.snapshot;
      return current;
    },
    (next) => { this.snapshot = next; }
  );
}

class ShellHarness {
  public static readonly sampleUrl = '/logo.png';

  public static async awaitCondition(isReady: () => boolean, description: string): Promise<void> {
    const deadline = Date.now() + 6_000;
    while (!isReady() && Date.now() < deadline) {
      await setTimeout(10);
    }
    assert.ok(isReady(), description);
  }

  /** Waits for the boot sample to extract, combine, and re-resolve, and for the last transition window to close. */
  public static async awaitQuiet(composition: PaletteSessionVueComposition, environment: FakeBrowserEnvironment): Promise<void> {
    await ShellHarness.awaitCondition(() => {
      const model = composition.readModel.value;
      const sampled = model.image.entries.length === 1 && model.image.entries[0]?.status === 'idle' && model.image.histogram.length > 0;
      const settled = sampled && model.status === 'idle';
      return settled;
    }, 'the boot sample settles');
    await composition.store.settled();
    await ShellHarness.awaitCondition(() => {
      const closed = !environment.classNames.has('is-switching-theme');
      return closed;
    }, 'the transition window closes');
  }

  public static async serverSnapshot(): Promise<PaletteSnapshotEntity.Type> {
    const memory = new MemorySlot();
    const composition = PaletteSessionVueComposition.resolve({});
    composition.boot(memory.slot, ShellHarness.sampleUrl);
    await composition.store.settled();
    const snapshot = memory.snapshot;
    assert.ok(snapshot !== null);
    await composition.dispose();
    return snapshot;
  }
}

await test('the server publishes each admitted snapshot into the handoff and touches no document', async () => {
  const memory = new MemorySlot();
  const composition = PaletteSessionVueComposition.resolve({});
  composition.boot(memory.slot, ShellHarness.sampleUrl);
  assert.equal(memory.snapshot, null, 'nothing is admitted before the first resolution');
  await composition.store.settled();

  assert.deepEqual(memory.snapshot, composition.readModel.value.resolved?.snapshot);
  const resolved = composition.readModel.value.resolved;
  assert.ok(resolved !== undefined);
  const roles = PaletteSessionRoleViews.roles(resolved.snapshot);
  assert.equal(typeof roles.background, 'string');
  assert.equal(typeof roles.brand, 'string');
  assert.equal(composition.error.value, null);
  assert.equal(composition.running.value, false);
  assert.equal(composition.readModel.value.image.entries.length, 0, 'no browser image work starts on the server');

  await composition.dispatch({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } });
  assert.deepEqual(memory.snapshot, composition.readModel.value.resolved?.snapshot);
  await composition.dispose();
});

await test('booting twice starts the shell once', async () => {
  const first = new MemorySlot();
  const second = new MemorySlot();
  const composition = PaletteSessionVueComposition.resolve({});
  composition.boot(first.slot, ShellHarness.sampleUrl);
  composition.boot(second.slot, ShellHarness.sampleUrl);
  await composition.store.settled();
  assert.ok(first.snapshot !== null);
  assert.equal(second.snapshot, null);
  await composition.dispose();
});

await test('concurrent server requests keep isolated sessions and handoffs', async () => {
  const firstSlot = new MemorySlot();
  const secondSlot = new MemorySlot();
  const first = PaletteSessionVueComposition.resolve({});
  const second = PaletteSessionVueComposition.resolve({});
  first.boot(firstSlot.slot, ShellHarness.sampleUrl);
  second.boot(secondSlot.slot, ShellHarness.sampleUrl);
  await Promise.all([
    first.dispatch({ 'interaction': 'palette.seed.set', 'payload': { 'hex': '#123456', 'index': 0 } }),
    second.dispatch({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } })
  ]);

  assert.equal(first.readModel.value.input.pickerSeeds[0]?.hex, '#123456');
  assert.equal(second.readModel.value.input.pickerSeeds[0]?.hex, '#000000');
  assert.equal(first.readModel.value.input.framing, 'dark');
  assert.equal(second.readModel.value.input.framing, 'light');
  assert.notDeepEqual(firstSlot.snapshot, secondSlot.snapshot);
  await Promise.all([first.dispose(), second.dispose()]);
});

await test('the client repaints from the server snapshot before any worker reply, then follows the read model', async (context) => {
  const snapshot = await ShellHarness.serverSnapshot();
  const environment = FakeBrowserEnvironment.install();
  context.after(() => { environment.uninstall(); });
  const memory = new MemorySlot();
  memory.snapshot = snapshot;
  const composition = PaletteSessionVueComposition.resolve({});

  composition.boot(memory.slot, ShellHarness.sampleUrl);

  assert.equal(memory.snapshot, null, 'the handoff is consumed');
  assert.deepEqual(composition.readModel.value.resolved?.snapshot, snapshot, 'the read model starts from the server palette');
  assert.equal(composition.paletteRevision.value, 0);
  assert.ok(environment.variables.size > 0, 'tokens are written before the worker answers');
  assert.equal(environment.classNames.has('dark'), true);
  assert.equal(environment.classNames.has('is-switching-theme'), false, 'the first paint runs outside the transition window');
  assert.equal(FakeEngineWorker.instances.size, 1);

  await ShellHarness.awaitCondition(() => {
    const done = composition.readModel.value.image.entries.length === 1 && composition.readModel.value.status === 'idle';
    return done;
  }, 'the sample image loads on first mount');
  await composition.dispose();
});

await test('a framing change repaints inside the colour-transition window and swaps the dark class', async (context) => {
  const environment = FakeBrowserEnvironment.install();
  context.after(() => { environment.uninstall(); });
  const memory = new MemorySlot();
  const composition = PaletteSessionVueComposition.resolve({});
  composition.boot(memory.slot, ShellHarness.sampleUrl);
  await ShellHarness.awaitQuiet(composition, environment);
  assert.equal(environment.classNames.has('dark'), true);

  await composition.dispatch({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } });
  assert.equal(environment.classNames.has('dark'), false);
  assert.equal(environment.document.documentElement.dataset.iridisFraming, 'light');
  assert.equal(environment.classNames.has('is-switching-theme'), true);

  await ShellHarness.awaitCondition(() => {
    const closed = !environment.classNames.has('is-switching-theme');
    return closed;
  }, 'the transition window closes');
  await composition.dispose();
});

await test('a withheld palette neither repaints nor opens a transition window', async (context) => {
  const environment = FakeBrowserEnvironment.install();
  context.after(() => { environment.uninstall(); });
  const memory = new MemorySlot();
  const composition = PaletteSessionVueComposition.resolve({});
  composition.boot(memory.slot, ShellHarness.sampleUrl);
  await ShellHarness.awaitQuiet(composition, environment);
  await composition.dispatch({ 'interaction': 'palette.contrast.strictness.select', 'payload': { 'strictness': 1 } });
  await composition.dispatch({ 'interaction': 'palette.non-mandatory-level.select', 'payload': { 'nonMandatoryLevel': 'AAA' } });
  await composition.dispatch({ 'interaction': 'palette.cvd-mode.select', 'payload': { 'cvdMode': 'enforce' } });
  await ShellHarness.awaitCondition(() => {
    const closed = !environment.classNames.has('is-switching-theme');
    return closed;
  }, 'earlier windows close');
  const writes = environment.document.documentElement.style.writes;

  await composition.dispatch({ 'interaction': 'palette.strict-compliance.select', 'payload': { 'enableStrictCompliance': true } });

  assert.equal(composition.readModel.value.withheld, true);
  assert.equal(environment.document.documentElement.style.writes, writes);
  assert.equal(environment.classNames.has('is-switching-theme'), false);
  await composition.dispose();
});

await test('dispose stops the shell, and a fresh composition for the app boots a new one', async (context) => {
  const environment = FakeBrowserEnvironment.install();
  context.after(() => { environment.uninstall(); });
  const app = {};
  const memory = new MemorySlot();
  const composition = PaletteSessionVueComposition.resolve(app);
  composition.boot(memory.slot, ShellHarness.sampleUrl);
  await ShellHarness.awaitCondition(() => {
    const painted = environment.variables.size > 0;
    return painted;
  }, 'the first palette paints');
  await composition.dispose();
  const writes = environment.document.documentElement.style.writes;
  await setTimeout(250);
  assert.equal(environment.document.documentElement.style.writes, writes);
  assert.equal(environment.classNames.has('is-switching-theme'), false);

  const fresh = PaletteSessionVueComposition.resolve(app);
  assert.notStrictEqual(fresh, composition);
  fresh.boot(new MemorySlot().slot, ShellHarness.sampleUrl);
  await ShellHarness.awaitCondition(() => {
    const repainted = environment.document.documentElement.style.writes > writes;
    return repainted;
  }, 'the fresh shell paints');
  await fresh.dispose();
});
