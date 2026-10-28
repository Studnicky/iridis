import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

import { ExtractionSettingsEntity } from '../app/composables/entities/ExtractionSettingsEntity.ts';
import { PaletteSessionInput } from '../app/composables/paletteSession/PaletteSessionInput.ts';
import { PaletteSessionModeGuard } from '../app/composables/paletteSession/PaletteSessionModeGuard.ts';
import { PaletteSessionVueComposition } from '../app/composables/paletteSession/PaletteSessionVueComposition.ts';
import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';

registerHooks(NuxtImportsLoader);

class GuardHarness {
  public static readonly tunedK = 5;
  public static readonly seedAdd = { 'interaction': 'palette.seed.add', 'payload': { 'hex': '#336699' } };
  public static readonly selectImage = { 'interaction': 'palette.mode.select', 'payload': { 'mode': 'image' } };
  public static readonly selectPicker = { 'interaction': 'palette.mode.select', 'payload': { 'mode': 'picker' } };

  public static tuning(): unknown {
    const settings = ExtractionSettingsEntity.intake({ ...PaletteSessionInput.initial().imageTuning, 'k': GuardHarness.tunedK });
    return { 'interaction': 'palette.image.tuning.set', 'payload': { 'settings': settings } };
  }
}

await test('an image action from picker mode is preceded by the image-mode selection', () => {
  const picker = PaletteSessionInput.initial();
  const command = GuardHarness.tuning();
  assert.deepEqual(PaletteSessionModeGuard.image(picker, command), [GuardHarness.selectImage, command]);
  assert.deepEqual(PaletteSessionModeGuard.image({ ...picker, 'mode': 'image' }, command), [command]);
});

await test('a picker action from image mode is preceded by the picker-mode selection', () => {
  const image = { ...PaletteSessionInput.initial(), 'mode': 'image' } as const;
  assert.deepEqual(PaletteSessionModeGuard.picker(image, GuardHarness.seedAdd), [GuardHarness.selectPicker, GuardHarness.seedAdd]);
  assert.deepEqual(PaletteSessionModeGuard.picker(PaletteSessionInput.initial(), GuardHarness.seedAdd), [GuardHarness.seedAdd]);
});

await test('dispatchImage forces image mode in the same settled step, and adds the selection only when needed', async () => {
  const composition = PaletteSessionVueComposition.resolve({});
  await composition.store.settled();
  const start = composition.readModel.value.revision;
  assert.equal(composition.readModel.value.input.mode, 'picker');

  await composition.dispatchImage(GuardHarness.tuning());
  const afterFirst = composition.readModel.value.revision;
  assert.equal(composition.readModel.value.input.mode, 'image');
  assert.equal(composition.readModel.value.input.imageTuning.k, GuardHarness.tunedK);

  await composition.dispatchImage(GuardHarness.tuning());
  const afterSecond = composition.readModel.value.revision;
  assert.equal(afterFirst - start, afterSecond - afterFirst + 1, 'only the first dispatch carries the mode selection');
  await composition.dispose();
});

await test('dispatchPicker forces picker mode first, so the command lands on the picker seeds', async () => {
  const composition = PaletteSessionVueComposition.resolve({});
  await composition.dispatch(GuardHarness.selectImage);
  assert.equal(composition.readModel.value.input.mode, 'image');
  const imageSeeds = composition.readModel.value.input.imageSeeds.length;

  await composition.dispatchPicker(GuardHarness.seedAdd);

  assert.equal(composition.readModel.value.input.mode, 'picker');
  assert.equal(composition.readModel.value.input.pickerSeeds.length, 3);
  assert.equal(composition.readModel.value.input.imageSeeds.length, imageSeeds);
  await composition.dispose();
});

await test('a rejected command in a guarded sequence keeps the mode selection that preceded it', async () => {
  const composition = PaletteSessionVueComposition.resolve({});
  await composition.store.settled();
  await composition.dispatchImage({ 'interaction': 'palette.seed.remove', 'payload': { 'index': 99 } });
  assert.equal(composition.readModel.value.input.mode, 'image');
  assert.equal(composition.readModel.value.input.imageSeeds.length, 2);
  await composition.dispose();
});
