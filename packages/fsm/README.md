# @studnicky/iridis-fsm

Palette state machine. Each named state resolves to a target palette; a
transition between two states is stepped forward via `tick()`, with every
intermediate frame evaluated by `@studnicky/iridis-anima`'s `evaluate()`.
`PaletteStateMachine` is an abstract class: subclass it, pass the state and
transition tables to `super()`, and override the lifecycle hooks to observe
what happens.

## Install

GitHub Packages requires a personal access token (classic) with
`read:packages`; the token's account must also have read access to this
package's repository. Expose the token as `NODE_AUTH_TOKEN`, then configure
the `@studnicky` scope before installing:

```ini
# ~/.npmrc
@studnicky:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
npm install @studnicky/iridis-fsm
```

## Usage

```ts
import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type {
  PaletteStateSchemaType,
  PaletteTransitionTableType,
} from '@studnicky/iridis-fsm';

import { PaletteStateMachine } from '@studnicky/iridis-fsm';

const idle: PaletteInterfaceType  = { accent: { l: 0.5,  c: 0.05, h: 200 } };
const alert: PaletteInterfaceType = { accent: { l: 0.6,  c: 0.20, h: 20  } };
const focus: PaletteInterfaceType = { accent: { l: 0.55, c: 0.15, h: 260 } };

const states: PaletteStateSchemaType = {
  alert: { palette: alert },
  focus: { palette: focus },
  idle:  { palette: idle },
};

const transitions: PaletteTransitionTableType = {
  alert: [],
  focus: ['idle'],
  idle:  ['alert', 'focus'],
};

class SiteMachine extends PaletteStateMachine {
  constructor() {
    super(states, transitions, 'idle');
  }

  protected override onTick(palette: PaletteInterfaceType, t: number): void {
    // apply `palette` to your document, e.g. one CSS custom property per role
  }

  protected override onEnterState(state: string): void {
    // fires once t reaches 1 for an inbound transition
  }
}

const machine = new SiteMachine();
machine.transition('alert');
machine.tick(0.1); // advance 10% of the way; call repeatedly (e.g. per animation frame)
```

## API

| Member | Kind | Behaviour |
|---|---|---|
| `currentState` | getter | The state the machine currently occupies (or is transitioning away from). |
| `isTransitioning` | getter | `true` while a transition is in progress (`tick()` has not yet reached `t=1`). |
| `transition(toState, options?)` | method | Begins a transition to `toState`. Returns `false` (and fires `onTransitionRejected`) if `toState` is unreachable per the transition table, or the machine is terminated. `options` is passed through to `iridis-anima`'s `evaluate()` on every subsequent `tick()`. |
| `tick(deltaT)` | method | Advances the in-progress transition by `deltaT` (clamped so total progress stays in `[0, 1]`), evaluating the intermediate palette and firing `onTick`. On reaching `t=1`, fires `onExitState` then `onEnterState` and settles into `toState`. |
| `isTerminated()` | method | `true` if the current state has no outgoing transitions in the transition table. |

## Lifecycle hooks

All no-op by default; override the ones you need.

| Hook | Fires |
|---|---|
| `onTransition(fromState, toState)` | When a transition begins, before the first `tick()`. |
| `onTick(palette, t)` | With each evaluated intermediate palette while a transition is in progress. |
| `onExitState(state)` | When leaving a state, once its outbound transition completes (`t=1`). |
| `onEnterState(state)` | When entering a state, once the inbound transition completes (`t=1`). |
| `onTransitionRejected(fromState, toState, reason)` | When `transition()` is rejected. `reason` is `'not-allowed'` or `'terminated'`. |

Part of [iridis](https://github.com/Studnicky/iridis).
