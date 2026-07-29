import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PaletteStateSchemaType, PaletteTransitionTableType } from '../src/types/index.ts';

import { PaletteStateMachine } from '../src/PaletteStateMachine.ts';

const idlePalette: PaletteInterfaceType = { 'accent': { 'c': 0.05, 'h': 200, 'l': 0.5 } };
const alertPalette: PaletteInterfaceType = { 'accent': { 'c': 0.2, 'h': 20, 'l': 0.6 } };
const focusPalette: PaletteInterfaceType = { 'accent': { 'c': 0.15, 'h': 260, 'l': 0.55 } };

const states: PaletteStateSchemaType = {
  'alert': { 'palette': alertPalette },
  'focus': { 'palette': focusPalette },
  'idle':  { 'palette': idlePalette }
};

const transitions: PaletteTransitionTableType = {
  'alert': [],
  'focus': ['idle'],
  'idle':  ['alert', 'focus']
};

type EventType =
  | { 'state': string;    'type': 'enter'; }
  | { 'state': string;     'type': 'exit'; }
  | { 'fromState': string; 'toState': string; 'type': 'rejected'; }
  | { 't': number;     'type': 'tick'; };

class TestMachine extends PaletteStateMachine {
  events: EventType[] = [];

  constructor(initialState: string) {
    super(states, transitions, initialState);
  }

  protected override onEnterState(state: string): void {
    this.events.push({ 'state': state, 'type': 'enter' });
  }

  protected override onExitState(state: string): void {
    this.events.push({ 'state': state, 'type': 'exit' });
  }

  protected override onTick(_palette: PaletteInterfaceType, t: number): void {
    this.events.push({ 't': t, 'type': 'tick' });
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
  const tickEvents = machine.events.filter((e): e is Extract<EventType, { 'type': 'tick' }> => {return e.type === 'tick';});
  assert.strictEqual(tickEvents.length, 2);
  assert.strictEqual(tickEvents[0]!.t, 0.5);
  assert.strictEqual(tickEvents[1]!.t, 1);
});

await test('onExitState fires before onEnterState on transition completion', () => {
  const machine = new TestMachine('idle');
  machine.transition('alert');
  machine.tick(1);

  const lifecycleEvents = machine.events.filter((e) => {return e.type === 'exit' || e.type === 'enter';});
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

  const enterEvents = machine.events.filter((e): e is Extract<EventType, { 'type': 'enter' }> => {return e.type === 'enter';});
  assert.deepStrictEqual(enterEvents.map((e) => { const result = e.state; return result; }), ['focus', 'idle']);
});
