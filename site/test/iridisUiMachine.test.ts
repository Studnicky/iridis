/**
 * Pure reducer coverage for IridisUiMachine — no Vue needed. `reduce()` is
 * exercised directly for the invalid-transition case since `transition()`
 * rethrows (as ReducerThrewError) rather than swallowing. Also covers the
 * MUTATE_SEEDS effect payloads (reduce() only describes the effect; it never
 * performs the mutation), the 'dragging'-variant handling that keeps
 * `reduce()` total for every reachable event, and an EffectInterpreter
 * round-trip smoke test.
 */

import { EffectInterpreter } from '@studnicky/fsm';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

import type { IridisUiStateType } from '../app/composables/types/iridisUiState.ts';

import { IridisUiMachine } from '../app/composables/fsm/IridisUiMachine.ts';
import { IridisUiActionType } from '../app/composables/types/iridisUiEvent.ts';
import { TestPatterns } from './fixtures/TestPatterns.ts';

register('./fixtures/NuxtImportsLoader.mjs', import.meta.url);

const TEST_NUXT_APP = Symbol.for('iridis.test.nuxt-app');

class SeedEffectRecorder {
  static readonly #seen: string[] = [];

  static begin(): string[] {
    SeedEffectRecorder.#seen.length = 0;
    return SeedEffectRecorder.#seen;
  }

  static record(effect: { readonly 'op': string }): void {
    SeedEffectRecorder.#seen.push(effect.op);
  }
}

await test('SELECT_MODE from idle resets activeIndex and updates mode', () => {
  const m = new IridisUiMachine();
  const idle = { 'activeIndex': 3, 'mode': 'picker', 'variant': 'idle' } satisfies IridisUiStateType.Type;
  const { state } = m.transition(idle, { 'mode': 'image', 'type': IridisUiActionType.SELECT_MODE });
  assert.equal(state.variant, 'idle');
  assert.equal(state.mode, 'image');
  assert.equal(state.activeIndex, 0);
});

await test('SELECT_CARD updates activeIndex', () => {
  const m = new IridisUiMachine();
  const { state } = m.transition(m.getInitialState(), { 'index': 4, 'type': IridisUiActionType.SELECT_CARD });
  assert.equal(state.activeIndex, 4);
});

await test('NAVIGATE wraps at both ends', () => {
  const m = new IridisUiMachine();
  const zero = { 'activeIndex': 0, 'mode': 'picker', 'variant': 'idle' } satisfies IridisUiStateType.Type;
  const backward = m.transition(zero, { 'count': 5, 'delta': -1, 'type': IridisUiActionType.NAVIGATE });
  assert.equal(backward.state.activeIndex, 4);

  const last = { 'activeIndex': 4, 'mode': 'picker', 'variant': 'idle' } satisfies IridisUiStateType.Type;
  const forward = m.transition(last, { 'count': 5, 'delta': 1, 'type': IridisUiActionType.NAVIGATE });
  assert.equal(forward.state.activeIndex, 0);
});

await test('DRAG_START -> DRAG_MOVE -> DRAG_END full cycle', () => {
  const m = new IridisUiMachine();
  const idle = { 'activeIndex': 1, 'mode': 'picker', 'variant': 'idle' } satisfies IridisUiStateType.Type;
  const started = m.transition(idle, { 'type': IridisUiActionType.DRAG_START });
  assert.equal(started.state.variant, 'dragging');

  const moved = m.transition(started.state, { 'dragPx': -120, 'type': IridisUiActionType.DRAG_MOVE });
  assert.equal(moved.state.variant, 'dragging');
  if (moved.state.variant !== 'dragging') { throw new Error('Drag move must preserve dragging state'); }
  assert.equal(moved.state.dragPx, -120);

  const ended = m.transition(moved.state, { 'count': 5, 'shiftedBy': 2, 'type': IridisUiActionType.DRAG_END });
  assert.equal(ended.state.variant, 'idle');
  assert.equal(ended.state.activeIndex, 3);
});

await test('SELECT_MODE while dragging settles the drag and applies the mode (does not throw)', () => {
  const m = new IridisUiMachine();
  const dragging = { 'activeIndex': 2, 'dragPx': -45, 'mode': 'picker', 'variant': 'dragging' } satisfies IridisUiStateType.Type;
  const { effects, state } = m.transition(dragging, { 'mode': 'image', 'type': IridisUiActionType.SELECT_MODE });
  assert.deepEqual(effects, []);
  assert.equal(state.variant, 'idle');
  assert.equal(state.mode, 'image');
  assert.equal(state.activeIndex, 0);
  assert.equal('dragPx' in state, false);
});

await test('a second DRAG_START while already dragging is idempotent', () => {
  const m = new IridisUiMachine();
  const dragging = { 'activeIndex': 1, 'dragPx': 30, 'mode': 'picker', 'variant': 'dragging' } satisfies IridisUiStateType.Type;
  const { effects, state } = m.transition(dragging, { 'type': IridisUiActionType.DRAG_START });
  assert.deepEqual(effects, []);
  assert.deepEqual(state, dragging);
});

await test('NAVIGATE while dragging is a safe no-op (does not throw, drag state untouched)', () => {
  const m = new IridisUiMachine();
  const dragging = { 'activeIndex': 1, 'dragPx': 10, 'mode': 'picker', 'variant': 'dragging' } satisfies IridisUiStateType.Type;
  const { effects, state } = m.transition(dragging, { 'count': 5, 'delta': 1, 'type': IridisUiActionType.NAVIGATE });
  assert.deepEqual(effects, []);
  assert.deepEqual(state, dragging);
});

await test('SET_SEED while dragging still emits its MUTATE_SEEDS effect and leaves state unchanged', () => {
  const m = new IridisUiMachine();
  const dragging = { 'activeIndex': 0, 'dragPx': 5, 'mode': 'picker', 'variant': 'dragging' } satisfies IridisUiStateType.Type;
  const { effects, state } = m.transition(dragging, { 'hex': '#010203', 'index': 0, 'type': IridisUiActionType.SET_SEED });
  assert.deepEqual(effects, [{ 'hex': '#010203', 'index': 0, 'op': 'set', 'variant': 'MUTATE_SEEDS' }]);
  assert.deepEqual(state, dragging);
});

await test('reduce() throws on an invalid transition (DRAG_MOVE while idle)', () => {
  const m = new IridisUiMachine();
  assert.throws(() => { m.reduce(m.getInitialState(), { 'dragPx': 0, 'type': IridisUiActionType.DRAG_MOVE }); }, TestPatterns.INVALID_DRAG_MOVE);
});

await test('reduce() throws on an invalid transition (DRAG_END while idle)', () => {
  const m = new IridisUiMachine();
  assert.throws(() => { m.reduce(m.getInitialState(), { 'count': 5, 'shiftedBy': 1, 'type': IridisUiActionType.DRAG_END }); }, TestPatterns.INVALID_DRAG_END);
});

await test('transition() rethrows (does not swallow) on an invalid transition', () => {
  const m = new IridisUiMachine();
  assert.throws(() => { m.transition(m.getInitialState(), { 'dragPx': 0, 'type': IridisUiActionType.DRAG_MOVE }); });
});

await test('ADD_SEED emits a MUTATE_SEEDS/add effect and leaves state unchanged', () => {
  const m = new IridisUiMachine();
  const idle = m.getInitialState();
  const { effects, state } = m.transition(idle, { 'hex': '#123456', 'type': IridisUiActionType.ADD_SEED });
  assert.deepEqual(effects, [{ 'hex': '#123456', 'op': 'add', 'variant': 'MUTATE_SEEDS' }]);
  assert.deepEqual(state, idle);
});

await test('REMOVE_SEED emits a MUTATE_SEEDS/remove effect with the index', () => {
  const m = new IridisUiMachine();
  const { effects } = m.transition(m.getInitialState(), { 'index': 2, 'type': IridisUiActionType.REMOVE_SEED });
  assert.deepEqual(effects, [{ 'index': 2, 'op': 'remove', 'variant': 'MUTATE_SEEDS' }]);
});

await test('SET_SEED emits a MUTATE_SEEDS/set effect with index and hex', () => {
  const m = new IridisUiMachine();
  const { effects } = m.transition(m.getInitialState(), { 'hex': '#abcdef', 'index': 1, 'type': IridisUiActionType.SET_SEED });
  assert.deepEqual(effects, [{ 'hex': '#abcdef', 'index': 1, 'op': 'set', 'variant': 'MUTATE_SEEDS' }]);
});

await test('EffectInterpreter round-trips a SELECT_MODE transition and invokes handlers for seed effects', async () => {
  const seen = SeedEffectRecorder.begin();
  const interpreter = EffectInterpreter.create({
    'handlers': {
      'MUTATE_SEEDS': SeedEffectRecorder.record
    },
    'machine': new IridisUiMachine()
  });
  interpreter.start();

  const states: string[] = [];
  interpreter.subscribe((s) => { states.push(`${s.variant}:${s.mode}:${s.activeIndex}`); });

  await interpreter.send({ 'mode': 'image', 'type': IridisUiActionType.SELECT_MODE });
  assert.equal(interpreter.getState().mode, 'image');
  assert.equal(interpreter.getState().activeIndex, 0);
  assert.ok(states.includes('idle:image:0'));

  await interpreter.send({ 'hex': '#ffffff', 'type': IridisUiActionType.ADD_SEED });
  assert.deepEqual(seen, ['add']);
  // ADD_SEED doesn't change UI state — the interpreter still notifies subscribers on every transition.
  assert.equal(interpreter.getState().variant, 'idle');
});

await test('UI interpreters and effect registries share one app context and isolate SSR requests', async (context) => {
  const { useIridisUiMachine } = await import('../app/composables/useIridisUiMachine.ts');
  const firstNuxtApp = {};
  const secondNuxtApp = {};
  const firstEffects: string[] = [];
  const secondEffects: string[] = [];
  context.after(() => { Reflect.deleteProperty(globalThis, TEST_NUXT_APP); });

  Reflect.set(globalThis, TEST_NUXT_APP, firstNuxtApp);
  const firstMachine = useIridisUiMachine();
  firstMachine.registerMutateSeedsHandler((effect) => { firstEffects.push(effect.op); });
  const firstMachineAgain = useIridisUiMachine();
  assert.strictEqual(firstMachine.state, firstMachineAgain.state);

  Reflect.set(globalThis, TEST_NUXT_APP, secondNuxtApp);
  const secondMachine = useIridisUiMachine();
  secondMachine.registerMutateSeedsHandler((effect) => { secondEffects.push(effect.op); });
  assert.notStrictEqual(firstMachine.state, secondMachine.state);

  await Promise.all([
    Promise.resolve().then(() => {
      firstMachine.send({ 'hex': '#123456', 'type': IridisUiActionType.ADD_SEED });
      firstMachine.send({ 'mode': 'image', 'type': IridisUiActionType.SELECT_MODE });
    }),
    Promise.resolve().then(() => {
      secondMachine.send({ 'hex': '#abcdef', 'type': IridisUiActionType.ADD_SEED });
    })
  ]);
  await Promise.resolve();

  assert.deepEqual(firstEffects, ['add']);
  assert.deepEqual(secondEffects, ['add']);
  assert.equal(firstMachine.state.value.mode, 'image');
  assert.equal(secondMachine.state.value.mode, 'picker');
});
