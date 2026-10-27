import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PaletteInteractionCommandEntity } from '../app/composables/paletteSession/entities/PaletteInteractionCommandEntity.ts';
import { PaletteSessionImage } from '../app/composables/paletteSession/PaletteSessionImage.ts';
import { PaletteSessionInput } from '../app/composables/paletteSession/PaletteSessionInput.ts';
import { PaletteSessionImageFixture } from './fixtures/PaletteSessionImageFixture.ts';

class ImageHarness {
  static apply(commands: readonly unknown[]) {
    let input = PaletteSessionInput.initial();
    let image = PaletteSessionImage.initial();
    for (let index = 0; index < commands.length; index += 1) {
      const command = PaletteInteractionCommandEntity.intake(commands[index]);
      image = PaletteSessionImage.reduce(image, command, input);
      input = PaletteSessionInput.reduce(input, command);
    }
    return { 'image': image, 'input': input };
  }

  static add(imageId: string): unknown {
    const result = { 'interaction': 'palette.image.entry.add', 'payload': { 'imageId': imageId, 'name': `${imageId}.png`, 'source': `blob:${imageId}` } };
    return result;
  }

  static extracted(imageId: string, records: readonly { 'hex': string; 'weight': number }[]): unknown {
    const candidates = [PaletteSessionImageFixture.candidate('k-means', [{ 'hex': '#0000ff', 'weight': 1 }])];
    const result = {
      'interaction': 'palette.image.entry.extracted',
      'payload': { 'imageId': imageId, 'result': PaletteSessionImageFixture.extraction(records, candidates) }
    };
    return result;
  }

  static count(hexes: readonly string[], hex: string): number {
    const matching = hexes.filter((candidate) => {
      const same = candidate === hex;
      return same;
    });
    return matching.length;
  }
}

const lopsided = PaletteSessionImageFixture.lopsided();

await test('an added entry starts extracting with the combine-stage tuning, and a duplicate id changes nothing', () => {
  const { image, input } = ImageHarness.apply([ImageHarness.add('img-1'), ImageHarness.add('img-1')]);
  assert.equal(image.entries.length, 1);
  const entry = image.entries[0];
  assert.equal(entry?.id, 'img-1');
  assert.equal(entry?.status, 'extracting');
  assert.deepEqual(entry?.settings, input.imageTuning);
  assert.equal(PaletteSessionImage.combineHexes(image).length, 0);
});

await test('an extraction reply settles its entry and a failure marks it failed until the entry extracts again', () => {
  const settled = ImageHarness.apply([ImageHarness.add('img-1'), ImageHarness.extracted('img-1', lopsided)]).image.entries[0];
  assert.equal(settled?.status, 'idle');
  assert.deepEqual(settled?.dominantColorRecords, lopsided);
  const failed = ImageHarness.apply([
    ImageHarness.add('img-1'),
    { 'interaction': 'palette.image.entry.failed', 'payload': { 'imageId': 'img-1', 'message': 'decode failed' } }
  ]).image.entries[0];
  assert.equal(failed?.status, 'failed');
  assert.equal(failed?.error, 'decode failed');
  const { input } = ImageHarness.apply([]);
  const recovered = ImageHarness.apply([
    ImageHarness.add('img-1'),
    { 'interaction': 'palette.image.entry.failed', 'payload': { 'imageId': 'img-1', 'message': 'decode failed' } },
    { 'interaction': 'palette.image.entry.settings.set', 'payload': { 'imageId': 'img-1', 'settings': { ...input.imageTuning, 'k': 4 } } }
  ]).image.entries[0];
  assert.equal(recovered?.status, 'extracting');
  assert.equal(recovered?.error, undefined);
  assert.equal(recovered?.settings.k, 4);
});

await test('replies and edits for an unknown entry leave the image state unchanged', () => {
  const before = ImageHarness.apply([ImageHarness.add('img-1')]).image;
  const after = ImageHarness.apply([
    ImageHarness.add('img-1'),
    ImageHarness.extracted('img-9', lopsided),
    { 'interaction': 'palette.image.entry.failed', 'payload': { 'imageId': 'img-9', 'message': 'late' } },
    { 'interaction': 'palette.image.entry.remove', 'payload': { 'imageId': 'img-9' } }
  ]).image;
  assert.deepEqual(after.entries, before.entries);
});

await test('combine hexes weight each colour by its share and follow the chosen candidate', () => {
  const base = [ImageHarness.add('img-1'), ImageHarness.extracted('img-1', lopsided)];
  const hexes = PaletteSessionImage.combineHexes(ImageHarness.apply(base).image);
  assert.equal(ImageHarness.count(hexes, '#aa0000'), 750);
  assert.equal(ImageHarness.count(hexes, '#00aa00'), 250);
  const chosen = ImageHarness.apply([
    ...base,
    { 'interaction': 'palette.image.entry.candidate.select', 'payload': { 'imageId': 'img-1', 'label': 'k-means' } }
  ]).image;
  assert.deepEqual(new Set(PaletteSessionImage.combineHexes(chosen)), new Set(['#0000ff']));
  const cleared = ImageHarness.apply([
    ...base,
    { 'interaction': 'palette.image.entry.candidate.select', 'payload': { 'imageId': 'img-1', 'label': 'k-means' } },
    { 'interaction': 'palette.image.entry.candidate.select', 'payload': { 'imageId': 'img-1' } }
  ]).image;
  assert.equal(cleared.entries[0]?.selectedCandidateLabel, undefined);
  assert.equal(ImageHarness.count(PaletteSessionImage.combineHexes(cleared), '#aa0000'), 750);
});

await test('a candidate label that no longer exists falls back to the dominant colours', () => {
  const image = ImageHarness.apply([
    ImageHarness.add('img-1'),
    ImageHarness.extracted('img-1', lopsided),
    { 'interaction': 'palette.image.entry.candidate.select', 'payload': { 'imageId': 'img-1', 'label': 'median-cut' } }
  ]).image;
  assert.equal(ImageHarness.count(PaletteSessionImage.combineHexes(image), '#aa0000'), 750);
});

await test('triggers request a combine unless locked, and an explicit request always does', () => {
  const settled = ImageHarness.apply([ImageHarness.add('img-1'), ImageHarness.extracted('img-1', lopsided)]).image;
  const extracted = PaletteInteractionCommandEntity.intake(ImageHarness.extracted('img-1', lopsided));
  const request = PaletteInteractionCommandEntity.intake({ 'interaction': 'palette.image.combine.request', 'payload': {} });
  const add = PaletteInteractionCommandEntity.intake(ImageHarness.add('img-2'));
  const locked = ImageHarness.apply([
    ImageHarness.add('img-1'),
    ImageHarness.extracted('img-1', lopsided),
    { 'interaction': 'palette.image.combine.lock.select', 'payload': { 'enableCombineLock': true } }
  ]).image;
  assert.equal(PaletteSessionImage.requestsCombine(settled, extracted), true);
  assert.equal(PaletteSessionImage.requestsCombine(settled, add), false);
  assert.equal(PaletteSessionImage.requestsCombine(locked, extracted), false);
  assert.equal(PaletteSessionImage.requestsCombine(locked, request), true);
  assert.equal(locked.enableCombineLock, true);
});

await test('the combine lane reads combining, then idle on an outcome and failed on a failure', () => {
  const base = [ImageHarness.add('img-1'), ImageHarness.extracted('img-1', lopsided)];
  assert.equal(ImageHarness.apply(base).image.combine.status, 'combining');
  const failed = ImageHarness.apply([...base, { 'interaction': 'palette.image.combine.failed', 'payload': { 'message': 'combine fault' } }]).image;
  assert.deepEqual(failed.combine, { 'error': 'combine fault', 'status': 'failed' });
  const applied = ImageHarness.apply([
    ...base,
    { 'interaction': 'palette.image.combine.failed', 'payload': { 'message': 'combine fault' } },
    { 'interaction': 'palette.image.combine.applied', 'payload': { 'result': { 'candidates': [], 'extracted': ['#123456'], 'histogram': lopsided } } }
  ]).image;
  assert.deepEqual(applied.combine, { 'status': 'idle' });
  assert.deepEqual(applied.histogram, lopsided);
});

await test('with no contributing colours a trigger leaves the combine lane idle', () => {
  const image = ImageHarness.apply([ImageHarness.add('img-1'), { 'interaction': 'palette.image.combine.request', 'payload': {} }]).image;
  assert.equal(image.combine.status, 'idle');
});

await test('a combine outcome feeds both seed lists, keeps surviving pins, and empty extraction restores the defaults', () => {
  const { input } = ImageHarness.apply([
    { 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 1, 'role': 'brand' } },
    { 'interaction': 'palette.mode.select', 'payload': { 'mode': 'image' } },
    { 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 0, 'role': 'text' } },
    { 'interaction': 'palette.image.combine.applied', 'payload': { 'result': { 'candidates': [], 'extracted': ['#ffffff', '#445566'], 'histogram': [] } } }
  ]);
  assert.deepEqual(input.pickerSeeds, [{ 'hex': '#ffffff', 'role': 'brand' }, { 'hex': '#445566' }]);
  assert.deepEqual(input.imageSeeds, [{ 'hex': '#ffffff' }, { 'hex': '#445566' }]);
  const reset = ImageHarness.apply([
    { 'interaction': 'palette.image.combine.applied', 'payload': { 'result': { 'candidates': [], 'extracted': ['#445566'], 'histogram': [] } } },
    { 'interaction': 'palette.image.combine.applied', 'payload': { 'result': { 'candidates': [], 'extracted': [], 'histogram': [] } } }
  ]).input;
  assert.deepEqual(reset.pickerSeeds, [{ 'hex': '#000000' }, { 'hex': '#ffffff' }]);
  assert.deepEqual(reset.imageSeeds, [{ 'hex': '#000000' }, { 'hex': '#ffffff' }]);
});

await test('the mode switch selects the resolving seed list and seed edits touch only that list', () => {
  const { input } = ImageHarness.apply([
    { 'interaction': 'palette.mode.select', 'payload': { 'mode': 'image' } },
    { 'interaction': 'palette.seed.add', 'payload': { 'hex': '#336699' } }
  ]);
  assert.equal(input.mode, 'image');
  assert.deepEqual(PaletteSessionInput.activeSeeds(input), [{ 'hex': '#000000' }, { 'hex': '#ffffff' }, { 'hex': '#336699' }]);
  assert.deepEqual(input.pickerSeeds, [{ 'hex': '#000000' }, { 'hex': '#ffffff' }]);
  const base = PaletteSessionInput.initial();
  const switched = ImageHarness.apply([{ 'interaction': 'palette.mode.select', 'payload': { 'mode': 'image' } }]).input;
  assert.equal(PaletteSessionInput.fingerprint(switched), PaletteSessionInput.fingerprint(base));
  assert.notEqual(PaletteSessionInput.fingerprint(input), PaletteSessionInput.fingerprint(base));
});

await test('removing an entry drops its colours from the combine input', () => {
  const image = ImageHarness.apply([
    ImageHarness.add('img-1'),
    ImageHarness.extracted('img-1', lopsided),
    ImageHarness.add('img-2'),
    ImageHarness.extracted('img-2', [{ 'hex': '#0000aa', 'weight': 1 }]),
    { 'interaction': 'palette.image.entry.remove', 'payload': { 'imageId': 'img-1' } }
  ]).image;
  const ids = image.entries.map((entry) => {
    const id = entry.id;
    return id;
  });
  assert.deepEqual(ids, ['img-2']);
  assert.deepEqual(new Set(PaletteSessionImage.combineHexes(image)), new Set(['#0000aa']));
});
