import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';

import { ExtractionSettingsEntity } from '../app/composables/entities/ExtractionSettingsEntity.ts';
import { PaletteSessionVueComposition } from '../app/composables/paletteSession/PaletteSessionVueComposition.ts';
import { FakeBrowserEnvironment } from './fixtures/FakeBrowserEnvironment.ts';
import { FakeEngineWorker } from './fixtures/FakeEngineWorker.ts';
import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';

registerHooks(NuxtImportsLoader);

class IntakeHarness {
  public static async awaitCondition(isReady: () => boolean, description: string): Promise<void> {
    const deadline = Date.now() + 6_000;
    while (!isReady() && Date.now() < deadline) {
      await setTimeout(10);
    }
    assert.ok(isReady(), description);
  }

  public static async booted(): Promise<PaletteSessionVueComposition> {
    Reflect.set(globalThis, 'iridisTestNuxtApp', {});
    const { usePaletteSession } = await import('../app/composables/usePaletteSession.ts');
    const composition = usePaletteSession();
    await IntakeHarness.awaitCondition(() => {
      const ready = composition.readModel.value.image.entries.some((entry) => {
        const extracted = entry.name === 'Sample' && entry.status === 'idle';
        return extracted;
      });
      const finished = ready || composition.error.value !== null;
      return finished;
    }, 'the sample image extracts');
    await composition.store.settled();
    return composition;
  }

  public static files(...names: string[]): File[] {
    const result = names.map((name) => {
      const file = new File([new Uint8Array([1, 2, 3])], name, { 'type': 'image/png' });
      return file;
    });
    return result;
  }

  public static idleEntries(composition: PaletteSessionVueComposition): number {
    const entries = composition.readModel.value.image.entries;
    let count = 0;
    for (let index = 0; index < entries.length; index += 1) {
      if (entries[index]?.status === 'idle') {
        count += 1;
      }
    }
    return count;
  }
}

await test('boot extracts the sample image once, transfers its pixels, and combines it without leaving picker mode', async (context) => {
  const environment = FakeBrowserEnvironment.install();
  context.after(() => { environment.uninstall(); });
  const composition = await IntakeHarness.booted();

  const model = composition.readModel.value;
  assert.equal(composition.error.value, null);
  assert.equal(model.image.entries.length, 1);
  assert.equal(model.image.entries[0]?.name, 'Sample');
  assert.equal(model.image.entries[0]?.source, '/logo.png');
  assert.ok((model.image.entries[0]?.dominantColorRecords.length ?? 0) > 0, 'the worker extraction lands on the entry');
  assert.ok(model.image.histogram.length > 0, 'the worker combine lands on the shared histogram');
  assert.ok(model.image.candidates.length > 0, 'the worker combine candidates land on the shared candidates');
  assert.equal(model.input.mode, 'picker');
  assert.equal(composition.running.value, false);
  assert.equal(FakeEngineWorker.instances.size, 1);
  assert.equal(FakeEngineWorker.transferred.length, 1, 'the decoded pixel buffer is transferred to the worker once');
  assert.equal(model.image.entries[0]?.id.startsWith('img-1-'), true);

  const { usePaletteSession } = await import('../app/composables/usePaletteSession.ts');
  usePaletteSession();
  await setTimeout(30);
  assert.equal(composition.readModel.value.image.entries.length, 1);
  await composition.dispose();
});

await test('uploaded files switch to image mode, queue in order, and carry distinct ids', async (context) => {
  const environment = FakeBrowserEnvironment.install();
  context.after(() => { environment.uninstall(); });
  const composition = await IntakeHarness.booted();

  await Promise.all([
    composition.addImages(IntakeHarness.files('a.png', 'b.png')),
    composition.addImages(IntakeHarness.files('c.png'))
  ]);
  await IntakeHarness.awaitCondition(() => {
    const done = IntakeHarness.idleEntries(composition) === 4;
    return done;
  }, 'every upload extracts');

  const entries = composition.readModel.value.image.entries;
  assert.deepEqual(entries.map((entry) => {
    const name = entry.name;
    return name;
  }), ['Sample', 'a.png', 'b.png', 'c.png']);
  assert.equal(new Set(entries.map((entry) => {
    const identifier = entry.id;
    return identifier;
  })).size, 4);
  assert.equal(entries[1]?.source.startsWith('blob:'), true);
  assert.equal(composition.readModel.value.input.mode, 'image');
  assert.equal(FakeEngineWorker.transferred.length, 4);
  await composition.dispose();
});

await test('removing an image revokes its blob URL, releases its worker pixels, and drops the entry', async (context) => {
  const environment = FakeBrowserEnvironment.install();
  context.after(() => { environment.uninstall(); });
  const composition = await IntakeHarness.booted();

  await composition.addImages(IntakeHarness.files('gone.png'));
  await IntakeHarness.awaitCondition(() => {
    const done = IntakeHarness.idleEntries(composition) === 2;
    return done;
  }, 'the upload extracts');
  const removed = composition.readModel.value.image.entries[1];
  assert.ok(removed !== undefined);

  await composition.removeImage(removed.id);
  await composition.store.settled();

  assert.deepEqual(environment.revoked, [removed.source]);
  assert.deepEqual(composition.readModel.value.image.entries.map((entry) => {
    const name = entry.name;
    return name;
  }), ['Sample']);
  await IntakeHarness.awaitCondition(() => {
    const released = FakeEngineWorker.count('release', removed.id) === 1;
    return released;
  }, 'the worker releases the removed image');
  await composition.dispose();
});

await test('rapid setting changes on one image re-extract it once after the quiet period', async (context) => {
  const environment = FakeBrowserEnvironment.install();
  context.after(() => { environment.uninstall(); });
  const composition = await IntakeHarness.booted();
  const sample = composition.readModel.value.image.entries[0];
  assert.ok(sample !== undefined);
  const extractsBefore = FakeEngineWorker.count('extract', sample.id);

  for (let k = 3; k <= 6; k += 1) {
    composition.updateImageSetting(sample.id, ExtractionSettingsEntity.intake({ ...sample.settings, 'k': k }));
  }
  assert.equal(composition.readModel.value.image.entries[0]?.settings.k, sample.settings.k, 'no command lands inside the quiet period');

  await IntakeHarness.awaitCondition(() => {
    const settled = composition.readModel.value.image.entries[0]?.settings.k === 6 && IntakeHarness.idleEntries(composition) === 1;
    return settled;
  }, 'the last setting re-extracts');
  await composition.store.settled();
  assert.equal(FakeEngineWorker.count('extract', sample.id), extractsBefore + 1);
  await composition.dispose();
});

await test('a removal cancels the pending setting update of that image', async (context) => {
  const environment = FakeBrowserEnvironment.install();
  context.after(() => { environment.uninstall(); });
  const composition = await IntakeHarness.booted();
  const sample = composition.readModel.value.image.entries[0];
  assert.ok(sample !== undefined);

  composition.updateImageSetting(sample.id, ExtractionSettingsEntity.intake({ ...sample.settings, 'k': 5 }));
  await composition.removeImage(sample.id);
  await setTimeout(300);

  assert.equal(composition.readModel.value.image.entries.length, 0);
  assert.equal(composition.error.value, null);
  await composition.dispose();
});

await test('an image that fails to decode reports the failure, adds no entry, and revokes its blob URL', async (context) => {
  const environment = FakeBrowserEnvironment.install();
  context.after(() => { environment.uninstall(); });
  const composition = await IntakeHarness.booted();
  environment.failImages = true;

  await composition.addImages(IntakeHarness.files('broken.png'));

  assert.equal(composition.error.value, 'Image load failed');
  assert.equal(composition.readModel.value.image.entries.length, 1);
  assert.equal(environment.revoked.length, 1);
  environment.failImages = false;
  await composition.addImages(IntakeHarness.files('ok.png'));
  assert.equal(composition.error.value, null, 'the next upload clears the failure');
  await composition.dispose();
});

await test('the sample button adds the bundled image in image mode', async (context) => {
  const environment = FakeBrowserEnvironment.install();
  context.after(() => { environment.uninstall(); });
  const composition = await IntakeHarness.booted();

  await composition.extractSample();
  await IntakeHarness.awaitCondition(() => {
    const done = IntakeHarness.idleEntries(composition) === 2;
    return done;
  }, 'the second sample extracts');

  assert.equal(composition.readModel.value.input.mode, 'image');
  assert.deepEqual(composition.readModel.value.image.entries.map((entry) => {
    const name = entry.name;
    return name;
  }), ['Sample', 'Sample']);
  await composition.dispose();
});

await test('image intake does nothing on the server', async () => {
  const composition = PaletteSessionVueComposition.resolve({});
  await composition.store.settled();
  await composition.addImages(IntakeHarness.files('server.png'));
  composition.updateImageSetting('img-0', ExtractionSettingsEntity.intake(composition.readModel.value.input.imageTuning));
  await setTimeout(250);
  assert.equal(composition.readModel.value.image.entries.length, 0);
  assert.equal(composition.error.value, null);
  await composition.dispose();
});

await test('combining a further image resolves roles exactly when the hydrated seeds change, never from the combine itself', async (context) => {
  const environment = FakeBrowserEnvironment.install();
  context.after(() => { environment.uninstall(); });
  const composition = await IntakeHarness.booted();
  await composition.dispatch({ 'interaction': 'palette.mode.select', 'payload': { 'mode': 'image' } });
  await setTimeout(300);
  const resolvesBefore = FakeEngineWorker.count('palette');
  const combinesBefore = FakeEngineWorker.count('combine');
  const seedsBefore = JSON.stringify(composition.readModel.value.input.imageSeeds);

  await composition.extractSample();
  await IntakeHarness.awaitCondition(() => {
    const combined = FakeEngineWorker.count('combine') > combinesBefore && IntakeHarness.idleEntries(composition) === 2;
    const finished = combined && composition.readModel.value.image.combine.status === 'idle';
    return finished;
  }, 'the second image combines');
  await composition.store.settled();
  await setTimeout(300);

  const seedsChanged = JSON.stringify(composition.readModel.value.input.imageSeeds) !== seedsBefore;
  assert.equal(FakeEngineWorker.count('palette') - resolvesBefore, seedsChanged ? 1 : 0);
  assert.equal(composition.readModel.value.status, 'idle');
  assert.equal(composition.error.value, null);
  await composition.dispose();
});
