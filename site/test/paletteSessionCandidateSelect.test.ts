import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PaletteInteractionCommandEntity } from '../app/composables/paletteSession/entities/PaletteInteractionCommandEntity.ts';
import { PaletteSessionImage } from '../app/composables/paletteSession/PaletteSessionImage.ts';
import { PaletteSessionInput } from '../app/composables/paletteSession/PaletteSessionInput.ts';

class CandidateHarness {
  static readonly select = { 'interaction': 'palette.image.candidate.select', 'payload': { 'hexes': ['#112233', '#445566'], 'label': 'k-means' } };

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
}

await test('candidate selection admits a label with one to thirty-two hexes', () => {
  const admitted = PaletteInteractionCommandEntity.intake(CandidateHarness.select);
  assert.equal(admitted.interaction, 'palette.image.candidate.select');
  const tooMany = { ...CandidateHarness.select, 'payload': { 'hexes': new Array<string>(33).fill('#112233'), 'label': 'k-means' } };
  assert.throws(() => { PaletteInteractionCommandEntity.intake(tooMany); });
});

await test('candidate selection records the label and feeds both seed lists', () => {
  const { image, input } = CandidateHarness.apply([
    { 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 0, 'role': 'brand' } },
    { 'interaction': 'palette.image.candidate.select', 'payload': { 'hexes': ['#000000', '#445566'], 'label': 'k-means' } }
  ]);
  assert.equal(image.selectedCandidateLabel, 'k-means');
  assert.deepEqual(input.pickerSeeds, [{ 'hex': '#000000', 'role': 'brand' }, { 'hex': '#445566' }]);
  assert.deepEqual(input.imageSeeds, [{ 'hex': '#000000' }, { 'hex': '#445566' }]);
});

await test('candidate selection changes the resolving fingerprint and requests no combine', () => {
  const base = PaletteSessionInput.initial();
  const { image, input } = CandidateHarness.apply([CandidateHarness.select]);
  assert.notEqual(PaletteSessionInput.fingerprint(input), PaletteSessionInput.fingerprint(base));
  const command = PaletteInteractionCommandEntity.intake(CandidateHarness.select);
  assert.equal(PaletteSessionImage.requestsCombine(image, command), false);
});

await test('a combine outcome clears the selected candidate label', () => {
  const { image } = CandidateHarness.apply([
    CandidateHarness.select,
    { 'interaction': 'palette.image.combine.applied', 'payload': { 'result': { 'candidates': [], 'extracted': ['#123456'], 'histogram': [] } } }
  ]);
  assert.equal(image.selectedCandidateLabel, undefined);
  assert.equal('selectedCandidateLabel' in image, false);
});

await test('a later selection replaces the earlier label', () => {
  const { image } = CandidateHarness.apply([
    CandidateHarness.select,
    { 'interaction': 'palette.image.candidate.select', 'payload': { 'hexes': ['#abcdef'], 'label': 'median-cut' } }
  ]);
  assert.equal(image.selectedCandidateLabel, 'median-cut');
});
