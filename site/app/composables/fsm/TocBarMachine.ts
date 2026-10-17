import type { FsmStepInterface } from '@studnicky/fsm/browser';

import { StateMachine } from '@studnicky/fsm/browser';

import type { TocBarEvent } from '../types/tocBarEvent.ts';

import { TocBarState } from '../types/tocBarState.ts';

/** Owns the resolved TableOfContentsBar presentation state. */
export class TocBarMachine extends StateMachine<TocBarState, TocBarEvent, never> {
  static create(): TocBarMachine {
    const result = new TocBarMachine();
    return result;
  }

  getInitialState(): TocBarState {
    const result = TocBarState.top();
    if (result.isPastHero()) {
      throw new Error('The table-of-contents initial state must precede the hero boundary');
    }
    return result;
  }

  reduce(state: TocBarState, event: TocBarEvent): FsmStepInterface<TocBarState, never> {
    const result = { 'effects': [], 'state': event.transition(state) };
    return result;
  }
}
