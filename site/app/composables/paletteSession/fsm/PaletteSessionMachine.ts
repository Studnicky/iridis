import type { FsmStepInterface } from '@studnicky/fsm/browser';

import { StateMachine } from '@studnicky/fsm/browser';

import type { PaletteSessionInputEntity } from '../entities/PaletteSessionInputEntity.ts';
import type { PaletteSessionEffect } from './PaletteSessionEffect.ts';
import type { PaletteSessionEvent } from './PaletteSessionEvent.ts';

import { PaletteSessionState } from './PaletteSessionState.ts';

/** Owns the revision lifecycle: published revisions settle per tick, resolve once, and only the current revision's outcome publishes. */
export class PaletteSessionMachine extends StateMachine<PaletteSessionState, PaletteSessionEvent, PaletteSessionEffect> {
  readonly #initial: PaletteSessionInputEntity.Type;

  constructor(initial: PaletteSessionInputEntity.Type) {
    super();
    this.#initial = initial;
  }

  getInitialState(): PaletteSessionState {
    const result = PaletteSessionState.initial(this.#initial);
    return result;
  }

  reduce(state: PaletteSessionState, event: PaletteSessionEvent): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    const result = event.transition(state);
    return result;
  }
}
