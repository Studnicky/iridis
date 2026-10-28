import { colorRecordFactory } from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reactive } from 'vue';

import { PaletteResolveRequestEntity } from '../app/composables/entities/PaletteResolveRequestEntity.ts';
import { PaletteSnapshotEntity } from '../app/composables/entities/PaletteSnapshotEntity.ts';
import { PaletteResolve } from '../app/composables/paletteResolve.ts';
import { roleSchemaByName } from '../app/theme/RoleSchemaByName.ts';
import { Tokens } from '../app/theme/Tokens.ts';
import { PaletteResolveFixture } from './fixtures/PaletteResolveFixture.ts';

class TonalScaleAssertion {
  private static readonly aliases = ['error', 'info', 'neutral', 'primary', 'secondary', 'success', 'warning'];

  static all(tokens: ReturnType<typeof Tokens.mapFromEngine>): void {
    for (let aliasIndex = 0; aliasIndex < TonalScaleAssertion.aliases.length; aliasIndex += 1) {
      const alias = TonalScaleAssertion.aliases[aliasIndex];
      if (alias === undefined) {
        continue;
      }
      TonalScaleAssertion.one(tokens, alias);
    }
  }

  private static one(tokens: ReturnType<typeof Tokens.mapFromEngine>, alias: string): void {
    const shades: string[] = [];
    for (let shadeIndex = 0; shadeIndex < Tokens.SHADE_KEYS.length; shadeIndex += 1) {
      const shade = Tokens.SHADE_KEYS[shadeIndex];
      if (shade === undefined) {
        continue;
      }
      const value = tokens[`--ui-color-${alias}-${shade}`];
      if (value === undefined) {
        assert.fail(`Missing ${alias} shade ${shade}`);
      }
      shades.push(value);
    }
    assert.equal(new Set(shades).size, Tokens.SHADE_KEYS.length, `${alias} has distinct tonal shades`);
    for (let index = 1; index < shades.length; index += 1) {
      const priorShade = shades[index - 1];
      const currentShade = shades[index];
      assert.notEqual(priorShade, undefined, `${alias} shade before index ${index} exists`);
      assert.notEqual(currentShade, undefined, `${alias} shade at index ${index} exists`);
      if (priorShade === undefined || currentShade === undefined) {
        throw new Error(`${alias} tonal scale is incomplete at index ${index}`);
      }
      const prior = colorRecordFactory.fromHex(priorShade).oklch.l;
      const current = colorRecordFactory.fromHex(currentShade).oklch.l;
      assert.ok(prior > current, `${alias} shade lightness descends at index ${index}`);
    }
  }
}

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

await test('palette input carries the schema-authored VS Code bridge for its selected framing', () => {
  const request = PaletteResolveRequestEntity.create({ ...PaletteResolveFixture.request(), 'framing': 'light', 'schemaName': 'iridis-16' });
  const input = PaletteResolve.input(request);

  assert.deepEqual(input.metadata?.['vscode:roleBridge'], roleSchemaByName['iridis-16'].vscodeRoleBridge.light);
});

await test('output-enabled snapshots intake canonical VS Code themes for every schema and framing', () => {
  const schemaNames = Object.keys(roleSchemaByName);
  const framings = ['dark', 'light'] as const;
  for (let schemaIndex = 0; schemaIndex < schemaNames.length; schemaIndex += 1) {
    const schemaName = schemaNames[schemaIndex];
    if (schemaName === undefined) {
      throw new Error('Schema name is required.');
    }
    for (let framingIndex = 0; framingIndex < framings.length; framingIndex += 1) {
      const framing = framings[framingIndex];
      if (framing === undefined) {
        throw new Error('Framing is required.');
      }
      const request = PaletteResolveRequestEntity.create({
        ...PaletteResolveFixture.request(),
        'enableOutputs': true,
        'framing': framing,
        'schemaName': schemaName
      });
      const snapshot = PaletteResolve.run(request);
      const description = `${schemaName} ${framing}`;
      assert.notEqual(snapshot.vscodeTheme, undefined, `${description} emits a VS Code theme`);
      const restored = PaletteSnapshotEntity.intake(JSON.parse(JSON.stringify(snapshot)));
      assert.deepEqual(restored.vscodeTheme, snapshot.vscodeTheme, `${description} restores its canonical VS Code theme`);
    }
  }
});

await test('palette resolution supplies distinct monotonic tonal scales to every Nuxt alias', () => {
  const request = PaletteResolveRequestEntity.create(PaletteResolveFixture.request());
  const snapshot = PaletteResolve.run(request);
  const tokens = Tokens.mapFromEngine(Tokens.hexRecord(snapshot.roles), snapshot.scales);
  TonalScaleAssertion.all(tokens);
});

await test('palette resolution rejects an incoherent relationship graph at its engine boundary', () => {
  const request = PaletteResolveRequestEntity.intake({
    ...PaletteResolveFixture.request(),
    'relationshipGraph': { 'groups': [{}] }
  });

  assert.throws(() => {
    PaletteResolve.input(request);
  });
});
