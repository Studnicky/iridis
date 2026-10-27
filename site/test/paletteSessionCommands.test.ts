import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PaletteInteractionCommandEntity } from '../app/composables/paletteSession/entities/PaletteInteractionCommandEntity.ts';
import { PaletteInteractionEnvelopeEntity } from '../app/composables/paletteSession/entities/PaletteInteractionEnvelopeEntity.ts';
import { PaletteSessionCommandFixture } from './fixtures/PaletteSessionCommandFixture.ts';

await test('command admission accepts every valid variant', () => {
  const validCommands = PaletteSessionCommandFixture.valid();
  for (let index = 0; index < validCommands.length; index += 1) {
    const command = validCommands[index];
    assert.ok(command !== undefined);
    const admitted = PaletteInteractionCommandEntity.intake(command);
    assert.equal(admitted.interaction, command.interaction);
  }
});

await test('command admission rejects invalid payloads', () => {
  const invalidCommands = PaletteSessionCommandFixture.invalid();
  for (let index = 0; index < invalidCommands.length; index += 1) {
    const candidate = invalidCommands[index];
    assert.ok(candidate !== undefined);
    assert.throws(() => { PaletteInteractionCommandEntity.intake(candidate.value); }, Error, candidate.label);
  }
});

await test('envelope admission requires a correlation id and a positive revision', () => {
  const command = PaletteInteractionCommandEntity.intake(PaletteSessionCommandFixture.valid()[0]);
  const envelope = PaletteInteractionEnvelopeEntity.intake({ 'command': command, 'correlationId': 'intent-1', 'revision': 1 });
  assert.equal(envelope.revision, 1);
  assert.equal(envelope.correlationId, 'intent-1');
  assert.throws(() => { PaletteInteractionEnvelopeEntity.intake({ 'command': command, 'correlationId': '', 'revision': 1 }); });
  assert.throws(() => { PaletteInteractionEnvelopeEntity.intake({ 'command': command, 'correlationId': 'intent-1', 'revision': 0 }); });
});
