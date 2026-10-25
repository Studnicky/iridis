import type { JSONSchema7Type } from 'json-schema';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';

import { InputEntity } from '../../src/entities/InputEntity.ts';
import { RuntimeOptionsEntity } from '../../src/entities/RuntimeOptionsEntity.ts';
import { PaletteMetadataSlot } from '../../src/model/PaletteMetadataSlot.ts';
import { PaletteOutputSlot } from '../../src/model/PaletteOutputSlot.ts';

class PaletteSlotTestFixture {
  static malformedValues(): readonly JSONSchema7Type[] {
    return [[], null, 42, 'invalid'];
  }

  static state(): PaletteStateInterface {
    return {
      'colors': [],
      'input': InputEntity.intake({ 'colors': [] }),
      'metadata': {},
      'outputs':  {},
      'roles':    {},
      'runtime': RuntimeOptionsEntity.intake({}),
      'variants': {}
    };
  }
}

await test('PaletteOutputSlot creates a missing slot and reuses its object identity', () => {
  const state = PaletteSlotTestFixture.state();
  const created = PaletteOutputSlot.getOrCreate(state, 'plugin');

  assert.deepEqual(created, {});
  assert.strictEqual(state.outputs.plugin, created);

  created.status = 'ready';
  const reused = PaletteOutputSlot.getOrCreate(state, 'plugin');

  assert.strictEqual(reused, created);
  assert.equal(reused.status, 'ready');
});

await test('PaletteOutputSlot replaces malformed runtime values with object slots', () => {
  const state = PaletteSlotTestFixture.state();

  const malformedValues = PaletteSlotTestFixture.malformedValues();
  for (let index = 0; index < malformedValues.length; index += 1) {
    const malformed = malformedValues.at(index);
    if (malformed === undefined) {
      throw new Error(`Missing malformed slot value at index ${index}`);
    }
    state.outputs.plugin = malformed;
    const replacement = PaletteOutputSlot.getOrCreate(state, 'plugin');

    assert.notStrictEqual(replacement, malformed);
    assert.deepEqual(replacement, {});
    assert.strictEqual(state.outputs.plugin, replacement);
  }
});

await test('PaletteMetadataSlot creates a missing slot and reuses its object identity', () => {
  const state = PaletteSlotTestFixture.state();
  const created = PaletteMetadataSlot.getOrCreate(state, 'plugin');

  assert.deepEqual(created, {});
  assert.strictEqual(state.metadata.plugin, created);

  created.status = 'ready';
  const reused = PaletteMetadataSlot.getOrCreate(state, 'plugin');

  assert.strictEqual(reused, created);
  assert.equal(reused.status, 'ready');
});

await test('PaletteMetadataSlot replaces malformed runtime values with object slots', () => {
  const state = PaletteSlotTestFixture.state();

  const malformedValues = PaletteSlotTestFixture.malformedValues();
  for (let index = 0; index < malformedValues.length; index += 1) {
    const malformed = malformedValues.at(index);
    if (malformed === undefined) {
      throw new Error(`Missing malformed slot value at index ${index}`);
    }
    state.metadata.plugin = malformed;
    const replacement = PaletteMetadataSlot.getOrCreate(state, 'plugin');

    assert.notStrictEqual(replacement, malformed);
    assert.deepEqual(replacement, {});
    assert.strictEqual(state.metadata.plugin, replacement);
  }
});
