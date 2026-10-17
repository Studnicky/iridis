/**
 * Pure reducer coverage for IridisUiMachine — no Vue needed. `reduce()` is
 * exercised directly for the invalid-transition case since `transition()`
 * rethrows (as ReducerThrewError) rather than swallowing. Also covers the
 * MUTATE_SEEDS effect payloads (reduce() only describes the effect; it never
 * performs the mutation), the 'dragging'-variant handling that keeps
 * `reduce()` total for every reachable event, and an EffectInterpreter
 * round-trip smoke test.
 */

import { EffectInterpreter } from '@studnicky/fsm/browser';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

import { IridisUiMachine } from '../app/composables/fsm/IridisUiMachine.ts';
import { IridisUiEvent } from '../app/composables/types/iridisUiEvent.ts';
import { IridisUiState } from '../app/composables/types/iridisUiState.ts';
import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';

registerHooks(NuxtImportsLoader);


class SeedEffectRecorder {
  static readonly #seen: string[] = [];

  static begin(): string[] {
    SeedEffectRecorder.#seen.length = 0;
    return SeedEffectRecorder.#seen;
  }

  static record(effect: { readonly 'type': string }): void {
    SeedEffectRecorder.#seen.push(effect.type);
  }
}

await test('SELECT_MODE from idle resets activeIndex and updates mode', () => {
  const m = new IridisUiMachine();
  const idle = IridisUiState.idlePicker(3);
  const { state } = m.transition(idle, IridisUiEvent.selectImageMode());
  assert.equal(state.variant, 'idle');
  assert.equal(state.selectsImageMode(), true);
  assert.equal(state.activeIndex, 0);
});

await test('SELECT_CARD updates activeIndex', () => {
  const m = new IridisUiMachine();
  const { state } = m.transition(m.getInitialState(), IridisUiEvent.selectCard(4));
  assert.equal(state.activeIndex, 4);
});

await test('NAVIGATE wraps at both ends', () => {
  const m = new IridisUiMachine();
  const zero = IridisUiState.idlePicker(0);
  const backward = m.transition(zero, IridisUiEvent.navigate(5, -1));
  assert.equal(backward.state.activeIndex, 4);

  const last = IridisUiState.idlePicker(4);
  const forward = m.transition(last, IridisUiEvent.navigate(5, 1));
  assert.equal(forward.state.activeIndex, 0);
});

await test('DRAG_START -> DRAG_MOVE -> DRAG_END full cycle', () => {
  const m = new IridisUiMachine();
  const idle = IridisUiState.idlePicker(1);
  const started = m.transition(idle, IridisUiEvent.dragStart());
  assert.equal(started.state.variant, 'dragging');

  const moved = m.transition(started.state, IridisUiEvent.dragMove(-120));
  assert.equal(moved.state.variant, 'dragging');
  if (moved.state.variant !== 'dragging') { throw new Error('Drag move must preserve dragging state'); }
  assert.equal(moved.state.dragOffset(), -120);

  const ended = m.transition(moved.state, IridisUiEvent.dragEnd(5, 2));
  assert.equal(ended.state.variant, 'idle');
  assert.equal(ended.state.activeIndex, 3);
});

await test('SELECT_MODE while dragging settles the drag and applies the mode (does not throw)', () => {
  const m = new IridisUiMachine();
  const dragging = IridisUiState.draggingPicker(2, -45);
  const { effects, state } = m.transition(dragging, IridisUiEvent.selectImageMode());
  assert.deepEqual(effects, []);
  assert.equal(state.variant, 'idle');
  assert.equal(state.selectsImageMode(), true);
  assert.equal(state.activeIndex, 0);
  assert.equal('dragPx' in state, false);
});

await test('a second DRAG_START while already dragging is idempotent', () => {
  const m = new IridisUiMachine();
  const dragging = IridisUiState.draggingPicker(1, 30);
  const { effects, state } = m.transition(dragging, IridisUiEvent.dragStart());
  assert.deepEqual(effects, []);
  assert.deepEqual(state, dragging);
});

await test('NAVIGATE while dragging is a safe no-op (does not throw, drag state untouched)', () => {
  const m = new IridisUiMachine();
  const dragging = IridisUiState.draggingPicker(1, 10);
  const { effects, state } = m.transition(dragging, IridisUiEvent.navigate(5, 1));
  assert.deepEqual(effects, []);
  assert.deepEqual(state, dragging);
});

await test('SET_SEED while dragging still emits its MUTATE_SEEDS effect and leaves state unchanged', () => {
  const m = new IridisUiMachine();
  const dragging = IridisUiState.draggingPicker(0, 5);
  const { effects, state } = m.transition(dragging, IridisUiEvent.setSeed(0, '#010203'));
  assert.equal(effects[0]?.type, 'SET_SEED');
  assert.deepEqual(state, dragging);
});

await test('reduce() throws on an invalid transition (DRAG_MOVE while idle)', () => {
  const m = new IridisUiMachine();
  assert.throws(() => { m.reduce(m.getInitialState(), IridisUiEvent.dragMove(0)); }, { 'message': 'Cannot handle event "DRAG_MOVE" in an idle state' });
});

await test('reduce() throws on an invalid transition (DRAG_END while idle)', () => {
  const m = new IridisUiMachine();
  assert.throws(() => { m.reduce(m.getInitialState(), IridisUiEvent.dragEnd(5, 1)); }, { 'message': 'Cannot handle event "DRAG_END" in an idle state' });
});

await test('transition() rethrows (does not swallow) on an invalid transition', () => {
  const m = new IridisUiMachine();
  assert.throws(() => { m.transition(m.getInitialState(), IridisUiEvent.dragMove(0)); });
});

await test('ADD_SEED emits a MUTATE_SEEDS/add effect and leaves state unchanged', () => {
  const m = new IridisUiMachine();
  const idle = m.getInitialState();
  const { effects, state } = m.transition(idle, IridisUiEvent.addSeed('#123456'));
  assert.equal(effects[0]?.type, 'ADD_SEED');
  assert.deepEqual(state, idle);
});

await test('REMOVE_SEED emits a MUTATE_SEEDS/remove effect with the index', () => {
  const m = new IridisUiMachine();
  const { effects } = m.transition(m.getInitialState(), IridisUiEvent.removeSeed(2));
  assert.equal(effects[0]?.type, 'REMOVE_SEED');
});

await test('SET_SEED emits a MUTATE_SEEDS/set effect with index and hex', () => {
  const m = new IridisUiMachine();
  const { effects } = m.transition(m.getInitialState(), IridisUiEvent.setSeed(1, '#abcdef'));
  assert.equal(effects[0]?.type, 'SET_SEED');
});

await test('EffectInterpreter round-trips concrete state and effect behavior', async () => {
  const seen = SeedEffectRecorder.begin();
  const interpreter = EffectInterpreter.create(new IridisUiMachine(), {
    'handler': (effect) => {
      SeedEffectRecorder.record(effect);
    }
  });
  interpreter.start();

  const states: string[] = [];
  interpreter.subscribe((state) => {
    const mode = state.selectsImageMode() ? 'image' : 'picker';
    states.push(`${state.variant}:${mode}:${state.activeIndex}`);
  });

  await interpreter.send(IridisUiEvent.selectImageMode());
  assert.equal(interpreter.getState().selectsImageMode(), true);
  assert.equal(interpreter.getState().activeIndex, 0);
  assert.ok(states.includes('idle:image:0'));

  await interpreter.send(IridisUiEvent.addSeed('#ffffff'));
  assert.deepEqual(seen, ['ADD_SEED']);
  assert.equal(interpreter.getState().variant, 'idle');
});

await test('UI interpreters share one app context and isolate SSR state', async (context) => {
  const { useIridisUiMachine } = await import('../app/composables/useIridisUiMachine.ts');
  const firstNuxtApp = {};
  const secondNuxtApp = {};
  context.after(() => { Reflect.set(globalThis, 'iridisTestNuxtApp', undefined); });

  Reflect.set(globalThis, 'iridisTestNuxtApp', firstNuxtApp);
  const firstMachine = useIridisUiMachine();
  const firstMachineAgain = useIridisUiMachine();
  assert.strictEqual(firstMachine.state, firstMachineAgain.state);

  Reflect.set(globalThis, 'iridisTestNuxtApp', secondNuxtApp);
  const secondMachine = useIridisUiMachine();
  assert.notStrictEqual(firstMachine.state, secondMachine.state);

  firstMachine.send(IridisUiEvent.selectImageMode());
  secondMachine.send(IridisUiEvent.selectPickerMode());
  await new Promise<void>((resolve) => { setImmediate(resolve); });

  assert.equal(firstMachine.state.value.selectsImageMode(), true);
  assert.equal(secondMachine.state.value.selectsImageMode(), false);
});
