import type { PaletteStateInterface } from '@studnicky/iridis';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PaletteMetadataSlot } from '../../src/model/PaletteMetadataSlot.ts';
import { PaletteOutputSlot } from '../../src/model/PaletteOutputSlot.ts';

class PaletteSlotTestFixture {
  static malformedValues(): readonly (readonly never[] | null | number | string)[] {
    return [[], null, 42, 'invalid'];
  }

  static state(): PaletteStateInterface {
    return {
      'colors': [],
      'input': {
        'bypass':    undefined,
        'colors':    [],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     undefined,
        'runtime':   undefined
      },
      'metadata': {},
      'outputs':  {},
      'roles':    {},
      'runtime': {
        'colorSpace': undefined,
        'extra':      undefined,
        'framing':    undefined
      },
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

  for (const malformed of PaletteSlotTestFixture.malformedValues()) {
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

  for (const malformed of PaletteSlotTestFixture.malformedValues()) {
    state.metadata.plugin = malformed;
    const replacement = PaletteMetadataSlot.getOrCreate(state, 'plugin');

    assert.notStrictEqual(replacement, malformed);
    assert.deepEqual(replacement, {});
    assert.strictEqual(state.metadata.plugin, replacement);
  }
});
