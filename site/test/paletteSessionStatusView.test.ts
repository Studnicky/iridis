import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PaletteSessionImageEntity } from '../app/composables/paletteSession/entities/PaletteSessionImageEntity.ts';
import { PaletteSessionReadModelEntity } from '../app/composables/paletteSession/entities/PaletteSessionReadModelEntity.ts';
import { PaletteSessionImage } from '../app/composables/paletteSession/PaletteSessionImage.ts';
import { PaletteSessionInput } from '../app/composables/paletteSession/PaletteSessionInput.ts';
import { PaletteSessionReadModel } from '../app/composables/paletteSession/PaletteSessionReadModel.ts';
import { PaletteSessionStatusView } from '../app/composables/paletteSession/PaletteSessionStatusView.ts';

class StatusHarness {
  static entry(status: string, error?: string) {
    const settings = PaletteSessionInput.initial().imageTuning;
    const result = {
      'candidates': [],
      'dominantColorRecords': [],
      ...(error === undefined ? {} : { 'error': error }),
      'histogram': [],
      'id': `img-${status}`,
      'name': 'a.png',
      'settings': settings,
      'source': 'blob:a',
      'status': status
    };
    return result;
  }

  static idle(): PaletteSessionReadModelEntity.Type {
    const initial = PaletteSessionReadModel.initial(PaletteSessionInput.initial(), PaletteSessionImage.initial());
    const result = PaletteSessionReadModelEntity.create({ ...initial, 'status': 'idle' });
    return result;
  }

  static withImage(model: PaletteSessionReadModelEntity.Type, patch: object): PaletteSessionReadModelEntity.Type {
    const image = PaletteSessionImageEntity.intake({ ...model.image, ...patch });
    const result = PaletteSessionReadModelEntity.create({ ...model, 'image': image });
    return result;
  }
}

await test('an idle session with no image work reports nothing running and no error', () => {
  assert.deepEqual(PaletteSessionStatusView.from(StatusHarness.idle()), { 'error': null, 'resolving': false, 'running': false });
});

await test('a resolving palette lane is both resolving and running', () => {
  const initial = PaletteSessionReadModel.initial(PaletteSessionInput.initial(), PaletteSessionImage.initial());
  assert.deepEqual(PaletteSessionStatusView.from(initial), { 'error': null, 'resolving': true, 'running': true });
});

await test('a combining lane or an extracting entry is running without resolving', () => {
  const combining = StatusHarness.withImage(StatusHarness.idle(), { 'combine': { 'status': 'combining' } });
  assert.deepEqual(PaletteSessionStatusView.from(combining), { 'error': null, 'resolving': false, 'running': true });
  const extracting = StatusHarness.withImage(StatusHarness.idle(), { 'entries': [StatusHarness.entry('extracting')] });
  assert.deepEqual(PaletteSessionStatusView.from(extracting), { 'error': null, 'resolving': false, 'running': true });
  const settled = StatusHarness.withImage(StatusHarness.idle(), { 'entries': [StatusHarness.entry('idle')] });
  assert.equal(PaletteSessionStatusView.from(settled).running, false);
});

await test('the palette lane error wins over the combine and entry errors', () => {
  const idle = StatusHarness.idle();
  const entryOnly = StatusHarness.withImage(idle, { 'entries': [StatusHarness.entry('failed', 'decode failed')] });
  assert.equal(PaletteSessionStatusView.from(entryOnly).error, 'decode failed');
  const combineAndEntry = StatusHarness.withImage(idle, {
    'combine': { 'error': 'combine fault', 'status': 'failed' },
    'entries': [StatusHarness.entry('failed', 'decode failed')]
  });
  assert.equal(PaletteSessionStatusView.from(combineAndEntry).error, 'combine fault');
  const failed = PaletteSessionReadModel.failed(combineAndEntry, 'palette fault');
  assert.equal(PaletteSessionStatusView.from(failed).error, 'palette fault');
  assert.equal(PaletteSessionStatusView.from(failed).resolving, false);
});

