import { RoleRelationshipGraphEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PaletteInteractionCommandEntity } from '../app/composables/paletteSession/entities/PaletteInteractionCommandEntity.ts';
import { PaletteSessionInput } from '../app/composables/paletteSession/PaletteSessionInput.ts';
import { PaletteSessionRequest } from '../app/composables/paletteSession/PaletteSessionRequest.ts';
import { roleSchemaByName } from '../app/theme/RoleSchemaByName.ts';

class InputHarness {
  static apply(commands: readonly unknown[]) {
    let input = PaletteSessionInput.initial();
    for (let index = 0; index < commands.length; index += 1) {
      input = PaletteSessionInput.reduce(input, PaletteInteractionCommandEntity.intake(commands[index]));
    }
    return input;
  }

  static request(commands: readonly unknown[]) {
    const message = PaletteSessionRequest.palette(InputHarness.apply(commands));
    if (message.kind !== 'palette') {
      throw new TypeError('Expected a palette message');
    }
    return message.request;
  }
}

await test('the initial input resolves to the demo defaults', () => {
  const message = PaletteSessionRequest.palette(PaletteSessionInput.initial());
  assert.equal(message.kind, 'palette');
  if (message.kind === 'palette') {
    const graph = roleSchemaByName['iridis-32'].dark.relationshipGraph;
    assert.deepEqual(message.request, {
      'colorSpace': 'srgb',
      'cvdMode': 'nudge',
      'enableStrictCompliance': false,
      'framing': 'dark',
      'nonMandatoryLevel': 'AA',
      'relationshipGraph': graph === undefined ? undefined : RoleRelationshipGraphEntity.intake(structuredClone(graph)),
      'schemaName': 'iridis-32',
      'seeds': [{ 'hex': '#000000' }, { 'hex': '#ffffff' }],
      'strictness': 2
    });
  }
});

await test('a command sequence produces the pinned resolve request', () => {
  const request = InputHarness.request([
    { 'interaction': 'palette.schema.select', 'payload': { 'schemaName': 'iridis-8' } },
    { 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } },
    { 'interaction': 'palette.seed.set', 'payload': { 'hex': '#7c3aed', 'index': 0 } },
    { 'interaction': 'palette.seed.add', 'payload': { 'hex': '#06b6d4' } },
    { 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 0, 'role': 'brand' } },
    { 'interaction': 'palette.color-space.select', 'payload': { 'colorSpace': 'displayP3' } }
  ]);
  const graph = roleSchemaByName['iridis-8'].light.relationshipGraph;
  assert.deepEqual(request, {
    'colorSpace': 'displayP3',
    'cvdMode': 'nudge',
    'enableStrictCompliance': false,
    'framing': 'light',
    'nonMandatoryLevel': 'AA',
    'relationshipGraph': graph === undefined ? undefined : RoleRelationshipGraphEntity.intake(structuredClone(graph)),
    'schemaName': 'iridis-8',
    'seeds': [{ 'hex': '#7c3aed', 'role': 'brand' }, { 'hex': '#ffffff' }, { 'hex': '#06b6d4' }],
    'strictness': 2
  });
});

await test('the compliance controls reach the resolve request', () => {
  const request = InputHarness.request([
    { 'interaction': 'palette.contrast.strictness.select', 'payload': { 'strictness': 1 } },
    { 'interaction': 'palette.strict-compliance.select', 'payload': { 'enableStrictCompliance': true } },
    { 'interaction': 'palette.cvd-mode.select', 'payload': { 'cvdMode': 'enforce' } },
    { 'interaction': 'palette.non-mandatory-level.select', 'payload': { 'nonMandatoryLevel': 'AAA' } }
  ]);
  assert.equal(request.strictness, 1);
  assert.equal(request.enableStrictCompliance, true);
  assert.equal(request.cvdMode, 'enforce');
  assert.equal(request.nonMandatoryLevel, 'AAA');
});

await test('a role pins to one seed at a time and unpins on an empty assignment', () => {
  const pinned = InputHarness.apply([
    { 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 0, 'role': 'brand' } },
    { 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 1, 'role': 'brand' } }
  ]);
  assert.deepEqual(PaletteSessionInput.activeSeeds(pinned), [{ 'hex': '#000000' }, { 'hex': '#ffffff', 'role': 'brand' }]);
  const cleared = PaletteSessionInput.reduce(pinned, PaletteInteractionCommandEntity.intake({ 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 1 } }));
  assert.deepEqual(PaletteSessionInput.activeSeeds(cleared), [{ 'hex': '#000000' }, { 'hex': '#ffffff' }]);
});

await test('seed bounds hold: the last seed stays, the list caps, indexes are checked', () => {
  const single = InputHarness.apply([{ 'interaction': 'palette.seed.remove', 'payload': { 'index': 0 } }]);
  assert.equal(PaletteSessionInput.activeSeeds(single).length, 1);
  const unchanged = PaletteSessionInput.reduce(single, PaletteInteractionCommandEntity.intake({ 'interaction': 'palette.seed.remove', 'payload': { 'index': 0 } }));
  assert.equal(PaletteSessionInput.activeSeeds(unchanged).length, 1);
  const added: unknown[] = [];
  for (let index = 0; index < 40; index += 1) {
    added.push({ 'interaction': 'palette.seed.add', 'payload': { 'hex': '#010203' } });
  }
  assert.equal(PaletteSessionInput.activeSeeds(InputHarness.apply(added)).length, 32);
  assert.throws(() => { InputHarness.apply([{ 'interaction': 'palette.seed.set', 'payload': { 'hex': '#010203', 'index': 9 } }]); }, RangeError);
});

await test('a replacement keeps the role pinned to a surviving hex and a schema change retunes k', () => {
  const input = InputHarness.apply([
    { 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 1, 'role': 'text' } },
    { 'interaction': 'palette.seeds.replace', 'payload': { 'hexes': ['#ffffff', '#336699'] } },
    { 'interaction': 'palette.schema.select', 'payload': { 'schemaName': 'iridis-12' } }
  ]);
  assert.deepEqual(PaletteSessionInput.activeSeeds(input), [{ 'hex': '#ffffff', 'role': 'text' }, { 'hex': '#336699' }]);
  assert.equal(input.imageTuning.k, 12);
});

await test('image tuning changes the input but not the resolution fingerprint', () => {
  const base = PaletteSessionInput.initial();
  const tuned = PaletteSessionInput.reduce(base, PaletteInteractionCommandEntity.intake({
    'interaction': 'palette.image.tuning.set',
    'payload': { 'settings': { ...base.imageTuning, 'histogramBits': 4 } }
  }));
  assert.equal(tuned.imageTuning.histogramBits, 4);
  assert.equal(PaletteSessionInput.fingerprint(tuned), PaletteSessionInput.fingerprint(base));
  const lit = PaletteSessionInput.reduce(base, PaletteInteractionCommandEntity.intake({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } }));
  assert.notEqual(PaletteSessionInput.fingerprint(lit), PaletteSessionInput.fingerprint(base));
});
