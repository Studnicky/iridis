/**
 * Pure reducer coverage for IridisUiMachine — no Vue needed. `reduce()` is
 * exercised directly for the invalid-transition case since `transition()`
 * rethrows (as ReducerThrewError) rather than swallowing. Also covers the
 * MUTATE_SEEDS effect payloads (reduce() only describes the effect; it never
 * performs the mutation), the 'dragging'-variant handling that keeps
 * `reduce()` total for every reachable event, and an EffectInterpreter
 * round-trip smoke test.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { EffectInterpreter } from '@studnicky/fsm';

import { IridisUiMachine } from '../app/composables/fsm/IridisUiMachine.ts';

test('SELECT_MODE from idle resets activeIndex and updates mode', () => {
  const m = new IridisUiMachine();
  const idle = { 'activeIndex': 3, 'mode': 'picker' as const, 'variant': 'idle' as const };
  const { state } = m.transition(idle, { 'mode': 'image', 'type': 'SELECT_MODE' });
  assert.equal(state.variant, 'idle');
  assert.equal(state.mode, 'image');
  assert.equal(state.activeIndex, 0);
});

test('SELECT_CARD updates activeIndex', () => {
  const m = new IridisUiMachine();
  const { state } = m.transition(m.getInitialState(), { 'index': 4, 'type': 'SELECT_CARD' });
  assert.equal(state.activeIndex, 4);
});

test('NAVIGATE wraps at both ends', () => {
  const m = new IridisUiMachine();
  const zero = { 'activeIndex': 0, 'mode': 'picker' as const, 'variant': 'idle' as const };
  const backward = m.transition(zero, { 'count': 5, 'delta': -1, 'type': 'NAVIGATE' });
  assert.equal(backward.state.activeIndex, 4);

  const last = { 'activeIndex': 4, 'mode': 'picker' as const, 'variant': 'idle' as const };
  const forward = m.transition(last, { 'count': 5, 'delta': 1, 'type': 'NAVIGATE' });
  assert.equal(forward.state.activeIndex, 0);
});

test('DRAG_START -> DRAG_MOVE -> DRAG_END full cycle', () => {
  const m = new IridisUiMachine();
  const idle = { 'activeIndex': 1, 'mode': 'picker' as const, 'variant': 'idle' as const };
  const started = m.transition(idle, { 'type': 'DRAG_START' });
  assert.equal(started.state.variant, 'dragging');

  const moved = m.transition(started.state, { 'dragPx': -120, 'type': 'DRAG_MOVE' });
  assert.equal(moved.state.variant, 'dragging');
  assert.equal((moved.state as { dragPx: number }).dragPx, -120);

  const ended = m.transition(moved.state, { 'count': 5, 'shiftedBy': 2, 'type': 'DRAG_END' });
  assert.equal(ended.state.variant, 'idle');
  assert.equal(ended.state.activeIndex, 3);
});

test('SELECT_MODE while dragging settles the drag and applies the mode (does not throw)', () => {
  const m = new IridisUiMachine();
  const dragging = { 'activeIndex': 2, 'dragPx': -45, 'mode': 'picker' as const, 'variant': 'dragging' as const };
  const { effects, state } = m.transition(dragging, { 'mode': 'image', 'type': 'SELECT_MODE' });
  assert.deepEqual(effects, []);
  assert.equal(state.variant, 'idle');
  assert.equal(state.mode, 'image');
  assert.equal(state.activeIndex, 0);
  assert.equal('dragPx' in state, false);
});

test('a second DRAG_START while already dragging is idempotent', () => {
  const m = new IridisUiMachine();
  const dragging = { 'activeIndex': 1, 'dragPx': 30, 'mode': 'picker' as const, 'variant': 'dragging' as const };
  const { effects, state } = m.transition(dragging, { 'type': 'DRAG_START' });
  assert.deepEqual(effects, []);
  assert.deepEqual(state, dragging);
});

test('NAVIGATE while dragging is a safe no-op (does not throw, drag state untouched)', () => {
  const m = new IridisUiMachine();
  const dragging = { 'activeIndex': 1, 'dragPx': 10, 'mode': 'picker' as const, 'variant': 'dragging' as const };
  const { effects, state } = m.transition(dragging, { 'count': 5, 'delta': 1, 'type': 'NAVIGATE' });
  assert.deepEqual(effects, []);
  assert.deepEqual(state, dragging);
});

test('SET_SEED while dragging still emits its MUTATE_SEEDS effect and leaves state unchanged', () => {
  const m = new IridisUiMachine();
  const dragging = { 'activeIndex': 0, 'dragPx': 5, 'mode': 'picker' as const, 'variant': 'dragging' as const };
  const { effects, state } = m.transition(dragging, { 'hex': '#010203', 'index': 0, 'type': 'SET_SEED' });
  assert.deepEqual(effects, [{ 'hex': '#010203', 'index': 0, 'op': 'set', 'variant': 'MUTATE_SEEDS' }]);
  assert.deepEqual(state, dragging);
});

test('reduce() throws on an invalid transition (DRAG_MOVE while idle)', () => {
  const m = new IridisUiMachine();
  assert.throws(() => { m.reduce(m.getInitialState(), { 'dragPx': 0, 'type': 'DRAG_MOVE' }); }, /Cannot handle event "DRAG_MOVE" in state "idle"/);
});

test('reduce() throws on an invalid transition (DRAG_END while idle)', () => {
  const m = new IridisUiMachine();
  assert.throws(() => { m.reduce(m.getInitialState(), { 'count': 5, 'shiftedBy': 1, 'type': 'DRAG_END' }); }, /Cannot handle event "DRAG_END" in state "idle"/);
});

test('transition() rethrows (does not swallow) on an invalid transition', () => {
  const m = new IridisUiMachine();
  assert.throws(() => { m.transition(m.getInitialState(), { 'dragPx': 0, 'type': 'DRAG_MOVE' }); });
});

test('ADD_SEED emits a MUTATE_SEEDS/add effect and leaves state unchanged', () => {
  const m = new IridisUiMachine();
  const idle = m.getInitialState();
  const { effects, state } = m.transition(idle, { 'hex': '#123456', 'type': 'ADD_SEED' });
  assert.deepEqual(effects, [{ 'hex': '#123456', 'op': 'add', 'variant': 'MUTATE_SEEDS' }]);
  assert.deepEqual(state, idle);
});

test('REMOVE_SEED emits a MUTATE_SEEDS/remove effect with the index', () => {
  const m = new IridisUiMachine();
  const { effects } = m.transition(m.getInitialState(), { 'index': 2, 'type': 'REMOVE_SEED' });
  assert.deepEqual(effects, [{ 'index': 2, 'op': 'remove', 'variant': 'MUTATE_SEEDS' }]);
});

test('SET_SEED emits a MUTATE_SEEDS/set effect with index and hex', () => {
  const m = new IridisUiMachine();
  const { effects } = m.transition(m.getInitialState(), { 'hex': '#abcdef', 'index': 1, 'type': 'SET_SEED' });
  assert.deepEqual(effects, [{ 'hex': '#abcdef', 'index': 1, 'op': 'set', 'variant': 'MUTATE_SEEDS' }]);
});

test('EffectInterpreter round-trips a SELECT_MODE transition and invokes handlers for seed effects', async () => {
  const seen: string[] = [];
  const interpreter = EffectInterpreter.create({
    'handlers': {
      'MUTATE_SEEDS': (effect) => { seen.push(effect.op); }
    },
    'machine': new IridisUiMachine()
  });
  interpreter.start();

  const states: string[] = [];
  interpreter.subscribe((s) => { states.push(`${s.variant}:${s.mode}:${s.activeIndex}`); });

  await interpreter.send({ 'mode': 'image', 'type': 'SELECT_MODE' });
  assert.equal(interpreter.getState().mode, 'image');
  assert.equal(interpreter.getState().activeIndex, 0);
  assert.ok(states.includes('idle:image:0'));

  await interpreter.send({ 'hex': '#ffffff', 'type': 'ADD_SEED' });
  assert.deepEqual(seen, ['add']);
  // ADD_SEED doesn't change UI state — the interpreter still notifies subscribers on every transition.
  assert.equal(interpreter.getState().variant, 'idle');
});
