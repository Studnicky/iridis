import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PaletteSnapshotEntity } from '../app/composables/entities/PaletteSnapshotEntity.ts';
import { PaletteSessionEvent } from '../app/composables/paletteSession/fsm/PaletteSessionEvent.ts';
import { PaletteSessionMachine } from '../app/composables/paletteSession/fsm/PaletteSessionMachine.ts';
import { PaletteSessionInput } from '../app/composables/paletteSession/PaletteSessionInput.ts';
import { PaletteResolveFixture } from './fixtures/PaletteResolveFixture.ts';

class MachineHarness {
  static readonly input = PaletteSessionInput.initial();
  static readonly machine = new PaletteSessionMachine(MachineHarness.input);
  static readonly snapshot = PaletteSnapshotEntity.create(PaletteResolveFixture.snapshot());

  static variants(effects: readonly { readonly 'variant': string }[]) {
    const result = effects.map((effect) => { return effect.variant; });
    return result;
  }
}

await test('revisions published in one tick request one settle and one submission', () => {
  const { input, machine } = MachineHarness;
  const first = machine.transition(machine.getInitialState(), PaletteSessionEvent.published(1, 'intent-1', input));
  assert.deepEqual(MachineHarness.variants(first.effects), ['settle']);
  assert.equal(first.state.variant, 'settling');
  const second = machine.transition(first.state, PaletteSessionEvent.published(2, 'intent-2', input));
  assert.deepEqual(MachineHarness.variants(second.effects), []);
  assert.equal(second.state.revision, 2);
  const settled = machine.transition(second.state, PaletteSessionEvent.settled());
  assert.deepEqual(MachineHarness.variants(settled.effects), ['submit']);
  assert.equal(settled.state.variant, 'resolving');
  assert.equal(settled.state.revision, 2);
});

await test('only the current revision publishes its outcome', () => {
  const { input, machine, snapshot } = MachineHarness;
  const published = machine.transition(machine.getInitialState(), PaletteSessionEvent.published(2, 'intent-2', input));
  const resolving = machine.transition(published.state, PaletteSessionEvent.settled());
  const stale = machine.transition(resolving.state, PaletteSessionEvent.succeeded(1, snapshot));
  assert.deepEqual(MachineHarness.variants(stale.effects), []);
  assert.equal(stale.state.variant, 'resolving');
  const staleFailure = machine.transition(resolving.state, PaletteSessionEvent.failed(1, 'late'));
  assert.deepEqual(MachineHarness.variants(staleFailure.effects), []);
  const current = machine.transition(resolving.state, PaletteSessionEvent.succeeded(2, snapshot));
  assert.deepEqual(MachineHarness.variants(current.effects), ['publish']);
  assert.equal(current.state.variant, 'idle');
});

await test('a failure of the current revision is reported once and a later revision resolves again', () => {
  const { input, machine } = MachineHarness;
  const published = machine.transition(machine.getInitialState(), PaletteSessionEvent.published(1, 'intent-1', input));
  const resolving = machine.transition(published.state, PaletteSessionEvent.settled());
  const failed = machine.transition(resolving.state, PaletteSessionEvent.failed(1, 'engine fault'));
  assert.deepEqual(MachineHarness.variants(failed.effects), ['fail']);
  assert.equal(failed.state.variant, 'failed');
  assert.equal(failed.state.message, 'engine fault');
  const retried = machine.transition(failed.state, PaletteSessionEvent.published(2, 'intent-2', input));
  assert.deepEqual(MachineHarness.variants(retried.effects), ['settle']);
});
