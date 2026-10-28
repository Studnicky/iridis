import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PaletteSnapshotEntity } from '../app/composables/entities/PaletteSnapshotEntity.ts';
import { PaletteInteractionCommandEntity } from '../app/composables/paletteSession/entities/PaletteInteractionCommandEntity.ts';
import { PaletteSessionTuningPatchEntity } from '../app/composables/paletteSession/entities/PaletteSessionTuningPatchEntity.ts';
import { PaletteSessionImage } from '../app/composables/paletteSession/PaletteSessionImage.ts';
import { PaletteSessionImageViews } from '../app/composables/paletteSession/PaletteSessionImageViews.ts';
import { PaletteSessionInput } from '../app/composables/paletteSession/PaletteSessionInput.ts';
import { PaletteSessionRoleViews } from '../app/composables/paletteSession/PaletteSessionRoleViews.ts';
import { PaletteSessionTuningCommand } from '../app/composables/paletteSession/PaletteSessionTuningCommand.ts';
import { contrastRatio } from '../app/theme/ContrastRatio.ts';
import { BlockerSetFixture } from './fixtures/BlockerSetFixture.ts';
import { PaletteResolveFixture } from './fixtures/PaletteResolveFixture.ts';
import { PaletteSessionImageFixture } from './fixtures/PaletteSessionImageFixture.ts';

class ViewsHarness {
  static snapshot(): PaletteSnapshotEntity.Type {
    const result = PaletteSnapshotEntity.intake(PaletteResolveFixture.snapshot());
    return result;
  }

  static imageWithEntry() {
    const commands = [
      { 'interaction': 'palette.image.entry.add', 'payload': { 'imageId': 'img-1', 'name': 'a.png', 'source': 'blob:a' } },
      {
        'interaction': 'palette.image.entry.extracted',
        'payload': {
          'imageId': 'img-1',
          'result': PaletteSessionImageFixture.extraction(
            PaletteSessionImageFixture.lopsided(),
            [PaletteSessionImageFixture.candidate('k-means', [{ 'hex': '#0000ff', 'weight': 1 }])]
          )
        }
      }
    ];
    let input = PaletteSessionInput.initial();
    let image = PaletteSessionImage.initial();
    for (let index = 0; index < commands.length; index += 1) {
      const command = PaletteInteractionCommandEntity.intake(commands[index]);
      image = PaletteSessionImage.reduce(image, command, input);
      input = PaletteSessionInput.reduce(input, command);
    }
    return { 'image': image, 'input': input };
  }

  static withLabel(image: ReturnType<typeof PaletteSessionImage.initial>, input: ReturnType<typeof PaletteSessionInput.initial>, label: string) {
    const command = PaletteInteractionCommandEntity.intake({ 'interaction': 'palette.image.entry.candidate.select', 'payload': { 'imageId': 'img-1', 'label': label } });
    const result = PaletteSessionImage.reduce(image, command, input);
    return result;
  }
}

await test('roles builds the hex record of the resolved roles', () => {
  assert.deepEqual({ ...PaletteSessionRoleViews.roles(ViewsHarness.snapshot()) }, { 'background': '#fafafa', 'brand': '#112233' });
});

await test('roleViews maps each resolved role to its colour view', () => {
  const views = PaletteSessionRoleViews.roleViews(ViewsHarness.snapshot());
  assert.deepEqual(views.map((view) => { return view.name; }), ['brand', 'background']);
  assert.deepEqual(views[0], { 'c': 0.05, 'displayP3': { 'b': 0.2, 'g': 0.1, 'r': 0.05 }, 'h': 250, 'hex': '#112233', 'l': 0.3, 'name': 'brand' });
  assert.equal(views[1]?.hex, '#fafafa');
  assert.equal(views[1]?.displayP3, undefined);
});

await test('roleClamps keys the clamp records by role name', () => {
  const clamps = PaletteSessionRoleViews.roleClamps(ViewsHarness.snapshot());
  assert.deepEqual([...clamps.keys()], ['brand']);
  assert.deepEqual(clamps.get('brand'), {
    'resolvedHex': '#112233',
    'roleOklch': 'L 0.30 · C 0.05 · H 250',
    'seedHex': '#445566',
    'seedOklch': 'L 0.50 · C 0.04 · H 260'
  });
});

await test('roleDistances nests each role distance record as a Map', () => {
  const distances = PaletteSessionRoleViews.roleDistances(ViewsHarness.snapshot());
  assert.deepEqual([...distances.keys()], ['brand']);
  assert.deepEqual([...(distances.get('brand') ?? new Map<string, number>()).entries()], [['#445566', 0.12]]);
});

await test('roleContrastRows grades every role against the background role', () => {
  const rows = PaletteSessionRoleViews.roleContrastRows(ViewsHarness.snapshot(), PaletteSessionInput.initial());
  assert.deepEqual(rows.map((row) => { return row.name; }), ['brand', 'background']);
  assert.equal(rows[0]?.ratio, contrastRatio('#112233', '#fafafa'));
  assert.equal(rows[0]?.compliance, 'AAA');
  assert.equal(rows[0]?.hex, '#112233');
  assert.equal(rows[1]?.ratio, 1);
  assert.equal(rows[1]?.compliance, 'fail');
});

await test('roleContrastRows rejects a snapshot without a background role', () => {
  const base = ViewsHarness.snapshot();
  const headless = PaletteSnapshotEntity.intake({
    ...base,
    'roles': base.roles.filter((role) => {
      const kept = role.name !== 'background';
      return kept;
    })
  });
  assert.throws(() => { PaletteSessionRoleViews.roleContrastRows(headless, PaletteSessionInput.initial()); }, { 'message': 'Resolved palette is missing the required background role' });
});

await test('pinnableRoles lists the schema roles the demo renders and follows the framing', () => {
  const dark = PaletteSessionRoleViews.pinnableRoles(PaletteSessionInput.initial());
  assert.ok(dark.includes('brand'));
  assert.ok(dark.includes('background'));
  assert.equal(new Set(dark).size, dark.length);
  const light = PaletteSessionRoleViews.pinnableRoles(PaletteSessionInput.reduce(
    PaletteSessionInput.initial(),
    PaletteInteractionCommandEntity.intake({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } })
  ));
  assert.ok(light.includes('brand'));
});

await test('rejectedPinRoles names the active pinned roles a blocked pair mentions', () => {
  const pinned = PaletteSessionInput.reduce(
    PaletteSessionInput.reduce(
      PaletteSessionInput.initial(),
      PaletteInteractionCommandEntity.intake({ 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 0, 'role': 'text' } })
    ),
    PaletteInteractionCommandEntity.intake({ 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 1, 'role': 'brand' } })
  );
  assert.deepEqual(PaletteSessionRoleViews.rejectedPinRoles(BlockerSetFixture.blocked, pinned), ['text']);
  assert.deepEqual(PaletteSessionRoleViews.rejectedPinRoles(BlockerSetFixture.compliant, pinned), []);
  assert.deepEqual(PaletteSessionRoleViews.rejectedPinRoles(BlockerSetFixture.blocked, PaletteSessionInput.initial()), []);
});

await test('effectiveHexes follows the chosen candidate and falls back to the dominant colours', () => {
  const { image, input } = ViewsHarness.imageWithEntry();
  const entry = image.entries[0];
  assert.ok(entry !== undefined);
  assert.deepEqual(PaletteSessionImageViews.effectiveHexes(entry), ['#aa0000', '#00aa00']);
  const chosen = ViewsHarness.withLabel(image, input, 'k-means').entries[0];
  assert.ok(chosen !== undefined);
  assert.deepEqual(PaletteSessionImageViews.effectiveHexes(chosen), ['#0000ff']);
});

await test('strategy resolves the cluster strategy object of the serialized algorithm', () => {
  const settings = PaletteSessionInput.initial().imageTuning;
  assert.equal(PaletteSessionImageViews.strategy(settings).serializeAlgorithm(), 'delta-e');
  assert.equal(PaletteSessionImageViews.strategy({ ...settings, 'algorithm': 'k-means' }).serializeAlgorithm(), 'k-means');
});

await test('uploadedImage flattens an entry into the uploaded-image shape with a null label by default', () => {
  const { image } = ViewsHarness.imageWithEntry();
  const entry = image.entries[0];
  assert.ok(entry !== undefined);
  const view = PaletteSessionImageViews.uploadedImage(entry);
  assert.equal(view.id, 'img-1');
  assert.equal(view.name, 'a.png');
  assert.equal(view.source, 'blob:a');
  assert.equal(view.selectedCandidateLabel, null);
  assert.equal(view.k, entry.settings.k);
  assert.equal(view.deltaECap, 128);
  assert.equal(view.harmonizeThreshold, 10);
  assert.equal(view.histogramBits, 5);
  assert.deepEqual(view.chromaRange, [[0, 0.5]]);
  assert.deepEqual(view.lightnessRange, [[0, 1]]);
  assert.notStrictEqual(view.chromaRange, entry.settings.chromaRange);
  assert.equal(view.strategy.serializeAlgorithm(), 'delta-e');
  assert.deepEqual(view.dominantColorRecords, PaletteSessionImageFixture.lopsided());
  assert.equal(view.candidates[0]?.label, 'k-means');
});

await test('uploadedImages carries the selected candidate label for every entry', () => {
  const { image, input } = ViewsHarness.imageWithEntry();
  const chosen = ViewsHarness.withLabel(image, input, 'k-means');
  const views = PaletteSessionImageViews.uploadedImages(chosen);
  assert.deepEqual(views.map((view) => { return view.selectedCandidateLabel; }), ['k-means']);
  assert.deepEqual(PaletteSessionImageViews.uploadedImages(PaletteSessionImage.initial()), []);
});

await test('the tuning command applies only the patched fields to the current settings', () => {
  const current = PaletteSessionInput.initial().imageTuning;
  const command = PaletteSessionTuningCommand.from(current, PaletteSessionTuningPatchEntity.intake({ 'algorithm': 'wu-quantize', 'k': 4 }));
  assert.equal(command.interaction, 'palette.image.tuning.set');
  assert.deepEqual(command.payload, { 'settings': { ...current, 'algorithm': 'wu-quantize', 'k': 4 } });
  const reduced = PaletteSessionInput.reduce(PaletteSessionInput.initial(), command);
  assert.equal(reduced.imageTuning.k, 4);
  assert.equal(reduced.imageTuning.algorithm, 'wu-quantize');
  assert.throws(() => { PaletteSessionTuningCommand.from(current, PaletteSessionTuningPatchEntity.intake({ 'k': Number.NaN })); });
});
