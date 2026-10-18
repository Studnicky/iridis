import type { FsmStepInterface } from '@studnicky/fsm/browser';

import { StateMachine } from '@studnicky/fsm/browser';

import type { IridisUiEffect, IridisUiEvent } from '../types/index.ts';

import { IridisUiState } from '../types/iridisUiState.ts';

/** Owns the UI transition protocol; each concrete event supplies its own state and effect behavior. */
export class IridisUiMachine extends StateMachine<IridisUiState, IridisUiEvent, IridisUiEffect> {
  constructor() { super(); }

  getInitialState(): IridisUiState {
    const result = IridisUiState.idlePicker(0);
    if (result.isDragging()) {
      throw new Error('The Iridis UI initial state cannot have a drag in progress');
    }
    return result;
  }

  reduce(state: IridisUiState, event: IridisUiEvent): FsmStepInterface<IridisUiState, IridisUiEffect> {
    const result = event.transition(state);
    if (result.state.activeIndex < 0) {
      throw new RangeError('An Iridis UI transition cannot produce a negative active index');
    }
    return result;
  }
}
