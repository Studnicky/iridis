import type { PaletteEntity } from '@studnicky/iridis-algebra';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PaletteStateMachine } from '../src/PaletteStateMachine.ts';
import { PaletteStateMachineFixture } from './fixtures/PaletteStateMachineFixture.ts';

class TestMachine extends PaletteStateMachine {
  events: (
    | { 'state': string; 'type': 'enter'; }
    | { 'state': string; 'type': 'exit'; }
    | { 'fromState': string; 'toState': string; 'type': 'rejected'; }
    | { 't': number; 'type': 'tick'; }
  )[] = [];

  constructor(initialState: string) {
    super(PaletteStateMachineFixture.states, PaletteStateMachineFixture.transitions, initialState);
  }

  protected override onEnterState(state: string): void {
    this.events.push({ 'state': state, 'type': 'enter' });
  }

  protected override onExitState(state: string): void {
    this.events.push({ 'state': state, 'type': 'exit' });
  }

  protected override onTick(_palette: PaletteEntity.Type, progress: number): void {
    this.events.push({ 't': progress, 'type': 'tick' });
  }

  protected override onTransitionRejected(fromState: string, toState: string, _reason: string): void {
    this.events.push({ 'fromState': fromState, 'toState': toState, 'type': 'rejected' });
  }
}

await test('tick() drives intermediate palette(t) values and completes the transition', () => {
  const machine = new TestMachine('idle');
  const started = machine.transition('alert');
  assert.strictEqual(started, true);

  machine.tick(0.5);
  machine.tick(0.5);

  assert.strictEqual(machine.currentState, 'alert');
  let tickCount = 0;
  for (let index = 0; index < machine.events.length; index += 1) {
    const event = machine.events[index];
    if (event?.type === 'tick') {
      if (tickCount === 0) {
        assert.strictEqual(event.t, 0.5);
      }
      if (tickCount === 1) {
        assert.strictEqual(event.t, 1);
      }
      tickCount += 1;
    }
  }
  assert.strictEqual(tickCount, 2);
});

await test('onExitState fires before onEnterState on transition completion', () => {
  const machine = new TestMachine('idle');
  machine.transition('alert');
  machine.tick(1);

  const lifecycleEvents: ({ 'state': string; 'type': 'enter'; } | { 'state': string; 'type': 'exit'; })[] = [];
  for (let index = 0; index < machine.events.length; index += 1) {
    const event = machine.events[index];
    if (event?.type === 'enter' || event?.type === 'exit') {
      lifecycleEvents.push(event);
    }
  }
  assert.deepStrictEqual(lifecycleEvents, [
    { 'state': 'idle', 'type': 'exit' },
    { 'state': 'alert', 'type': 'enter' }
  ]);
});

await test('transition() to a state absent from the transition table returns false and fires onTransitionRejected without mutating state', () => {
  const machine = new TestMachine('alert');
  const started = machine.transition('idle');

  assert.strictEqual(started, false);
  assert.strictEqual(machine.currentState, 'alert');
  assert.strictEqual(machine.isTransitioning, false);
  assert.deepStrictEqual(machine.events, [
    { 'fromState': 'alert', 'toState': 'idle', 'type': 'rejected' }
  ]);
});

await test('isTerminated() identifies a state with no outgoing transitions', () => {
  const machine = new TestMachine('alert');
  assert.strictEqual(machine.isTerminated(), true);

  const idleMachine = new TestMachine('idle');
  assert.strictEqual(idleMachine.isTerminated(), false);
});

await test('multiple sequential transitions: state after transition 1 becomes the from-state for transition 2', () => {
  const machine = new TestMachine('idle');

  machine.transition('focus');
  machine.tick(1);
  assert.strictEqual(machine.currentState, 'focus');

  const secondStarted = machine.transition('idle');
  assert.strictEqual(secondStarted, true);
  machine.tick(1);
  assert.strictEqual(machine.currentState, 'idle');

  const enteredStates: string[] = [];
  for (let index = 0; index < machine.events.length; index += 1) {
    const event = machine.events[index];
    if (event?.type === 'enter') {
      enteredStates.push(event.state);
    }
  }
  assert.deepStrictEqual(enteredStates, ['focus', 'idle']);
});
