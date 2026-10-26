import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reactive } from 'vue';

import { PaletteResolveRequestEntity } from '../app/composables/entities/PaletteResolveRequestEntity.ts';
import { PaletteSnapshotEntity } from '../app/composables/entities/PaletteSnapshotEntity.ts';
import { PaletteResolve } from '../app/composables/paletteResolve.ts';
import { PaletteResolveFixture } from './fixtures/PaletteResolveFixture.ts';

await test('request entity survives a JSON round trip unchanged', () => {
  const request = PaletteResolveRequestEntity.create(PaletteResolveFixture.request());
  const text = JSON.stringify(request);
  const restored = PaletteResolveRequestEntity.intake(JSON.parse(text));

  assert.deepEqual(restored, request);
  assert.equal(JSON.stringify(restored), text);
  assert.equal(text, JSON.stringify(PaletteResolveFixture.request()));
});

await test('snapshot entity survives a JSON round trip unchanged', () => {
  const snapshot = PaletteSnapshotEntity.create(PaletteResolveFixture.snapshot());
  const text = JSON.stringify(snapshot);
  const restored = PaletteSnapshotEntity.intake(JSON.parse(text));

  assert.deepEqual(restored, snapshot);
  assert.equal(JSON.stringify(restored), text);
  assert.equal(text, JSON.stringify(PaletteResolveFixture.snapshot()));
});

await test('a request built from reactive seed state is structured-cloneable', () => {
  const request = PaletteResolveRequestEntity.create({
    ...PaletteResolveFixture.request(),
    'seeds': PaletteResolve.seeds(reactive([{ 'hex': '#7c3aed', 'role': 'brand' }, { 'hex': '#06b6d4', 'role': void 0 }]))
  });

  assert.deepEqual(structuredClone(request), request);
  assert.deepEqual(request.seeds, [{ 'hex': '#7c3aed', 'role': 'brand' }, { 'hex': '#06b6d4' }]);
});

await test('request entity rejects an unknown schema name', () => {
  assert.throws(() => {
    PaletteResolveRequestEntity.intake({ ...PaletteResolveFixture.request(), 'schemaName': 'iridis-5' });
  });
});
