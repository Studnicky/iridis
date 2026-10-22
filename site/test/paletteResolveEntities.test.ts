import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reactive, toRaw } from 'vue';

import { DerivationConfigInterfaceTypeEntity } from '../app/composables/entities/DerivationConfigInterfaceTypeEntity.ts';
import { PaletteResolveEnvelopeInterfaceTypeEntity } from '../app/composables/entities/PaletteResolveEnvelopeInterfaceTypeEntity.ts';
import { PaletteResolveReplyInterfaceTypeEntity } from '../app/composables/entities/PaletteResolveReplyInterfaceTypeEntity.ts';
import { PaletteResolveRequestInterfaceTypeEntity } from '../app/composables/entities/PaletteResolveRequestInterfaceTypeEntity.ts';
import { PaletteSnapshotInterfaceTypeEntity } from '../app/composables/entities/PaletteSnapshotInterfaceTypeEntity.ts';
import { PaletteResolve } from '../app/composables/paletteResolve.ts';
import { PaletteResolveFixture } from './fixtures/PaletteResolveFixture.ts';

await test('request entity survives a JSON round trip unchanged', () => {
  const request = PaletteResolveRequestInterfaceTypeEntity.create(PaletteResolveFixture.request());
  const text = JSON.stringify(request);
  const restored = PaletteResolveRequestInterfaceTypeEntity.intake(JSON.parse(text));

  assert.deepEqual(restored, request);
  assert.equal(JSON.stringify(restored), text);
  assert.equal(text, JSON.stringify(PaletteResolveFixture.request()));
});

await test('snapshot entity survives a JSON round trip unchanged', () => {
  const snapshot = PaletteSnapshotInterfaceTypeEntity.create(PaletteResolveFixture.snapshot());
  const text = JSON.stringify(snapshot);
  const restored = PaletteSnapshotInterfaceTypeEntity.intake(JSON.parse(text));

  assert.deepEqual(restored, snapshot);
  assert.equal(JSON.stringify(restored), text);
  assert.equal(text, JSON.stringify(PaletteResolveFixture.snapshot()));
});

await test('envelope and reply entities carry request and snapshot through JSON', () => {
  const request = PaletteResolveRequestInterfaceTypeEntity.create(PaletteResolveFixture.request());
  const snapshot = PaletteSnapshotInterfaceTypeEntity.create(PaletteResolveFixture.snapshot());
  const envelope = PaletteResolveEnvelopeInterfaceTypeEntity.create({ 'id': 7, 'request': request });
  const reply = PaletteResolveReplyInterfaceTypeEntity.create({ 'id': 7, 'snapshot': snapshot });
  const failure = PaletteResolveReplyInterfaceTypeEntity.create({ 'failure': 'engine failed', 'id': 8 });

  assert.deepEqual(PaletteResolveEnvelopeInterfaceTypeEntity.intake(JSON.parse(JSON.stringify(envelope))), envelope);
  assert.deepEqual(PaletteResolveReplyInterfaceTypeEntity.intake(JSON.parse(JSON.stringify(reply))), reply);
  assert.equal(PaletteResolveReplyInterfaceTypeEntity.intake(JSON.parse(JSON.stringify(failure))).failure, 'engine failed');
});

await test('a request built from reactive state is structured-cloneable', () => {
  const derivationConfig = reactive(DerivationConfigInterfaceTypeEntity.create({
    'relations': { 'success': { 'algorithm': 'analogous', 'hueVariantIndex': 1 } }
  }));
  const request = PaletteResolveRequestInterfaceTypeEntity.create({
    ...PaletteResolveFixture.request(),
    'derivationConfig': toRaw(derivationConfig),
    'seeds': PaletteResolve.seeds(reactive([{ 'hex': '#7c3aed', 'role': 'brand' }, { 'hex': '#06b6d4', 'role': void 0 }]))
  });

  assert.deepEqual(structuredClone(request), request);
  assert.deepEqual(request.seeds, [{ 'hex': '#7c3aed', 'role': 'brand' }, { 'hex': '#06b6d4' }]);
});

await test('request entity rejects an unknown schema name', () => {
  assert.throws(() => {
    PaletteResolveRequestInterfaceTypeEntity.intake({ ...PaletteResolveFixture.request(), 'schemaName': 'iridis-5' });
  });
});
