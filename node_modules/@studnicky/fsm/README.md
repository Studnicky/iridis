# @studnicky/fsm

> Type-safe abstract FSM base class with async effect interpretation and named machine registry.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/fsm)

A lightweight finite state machine foundation built on a pure reducer model. Extend `StateMachine` to define states, events, and side-effect descriptors. Drive the machine at runtime with `EffectInterpreter`, which serialises concurrent events through an internal mailbox and dispatches effects asynchronously after each transition. `MachineRegistry` provides a process-scoped named store for sharing interpreter instances across modules without prop drilling.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/fsm
```

## Usage

```typescript
import { StateMachine, EffectInterpreter, MachineRegistry } from '@studnicky/fsm';
import type { FsmStepType, EffectHandlerMapType } from '@studnicky/fsm';

type TrafficState =
  | { readonly variant: 'red' }
  | { readonly variant: 'green' }
  | { readonly variant: 'amber' };

type TrafficEvent = { readonly type: 'advance' };

type TrafficEffect = { readonly variant: 'playSound'; readonly tone: string };

class TrafficLight extends StateMachine<TrafficState, TrafficEvent, TrafficEffect> {
  getInitialState(): TrafficState {
    return { variant: 'red' };
  }

  reduce(state: TrafficState, event: TrafficEvent): FsmStepType<TrafficState, TrafficEffect> {
    if (event.type === 'advance') {
      if (state.variant === 'red')   return { state: { variant: 'green' }, effects: [] };
      if (state.variant === 'green') return { state: { variant: 'amber' }, effects: [{ variant: 'playSound', tone: 'chime' }] };
      if (state.variant === 'amber') return { state: { variant: 'red' }, effects: [] };
    }
    return { state, effects: [] };
  }
}

const machine = new TrafficLight();

const handlers: EffectHandlerMapType<TrafficEffect> = {
  playSound: async (effect) => {
    console.log(`Playing tone: ${effect.tone}`);
  },
};

const interpreter = EffectInterpreter.create({ machine, handlers, machineId: 'intersection-1' });
// or via builder:
// const interpreter = EffectInterpreter.builder<TrafficState, TrafficEvent, TrafficEffect>()
//   .withMachine(machine)
//   .withHandlers(handlers)
//   .withOptions({ machineId: 'intersection-1' })
//   .build();
interpreter.start();

const unsubscribe = interpreter.subscribe((state) => {
  console.log('State:', state.variant);
});

await interpreter.send({ type: 'advance' }); // red → green
await interpreter.send({ type: 'advance' }); // green → amber (plays sound)
await interpreter.send({ type: 'advance' }); // amber → red

interpreter.stop();
unsubscribe();

// Register for cross-module access
MachineRegistry.register('intersection-1', interpreter);
const found = MachineRegistry.get('intersection-1');
MachineRegistry.unregister('intersection-1');
```

## Extending

Subclass `StateMachine` and implement `getInitialState` and `reduce` to define the machine's behaviour. Both methods must be pure — no side effects. Side effects are modelled as values returned in the `effects` array of `FsmStepType` and dispatched by `EffectInterpreter` via the handler map after the state transition completes.

```typescript
import { StateMachine } from '@studnicky/fsm';
import type { FsmStepType } from '@studnicky/fsm';

class MyMachine extends StateMachine<MyState, MyEvent, MyEffect> {
  getInitialState(): MyState {
    return { variant: 'idle' };
  }

  reduce(state: MyState, event: MyEvent): FsmStepType<MyState, MyEffect> {
    // Return next state and any effects to dispatch
    return { state, effects: [] };
  }
}
```
