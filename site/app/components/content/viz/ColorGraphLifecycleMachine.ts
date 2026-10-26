import type { FsmStepInterface } from '@studnicky/fsm/browser';

import { StateMachine } from '@studnicky/fsm/browser';

import type { ColorGraphLifecycleEvent } from './ColorGraphLifecycleEvent.ts';

import { ColorGraphLifecycleState } from './ColorGraphLifecycleState.ts';

/** Owns the color graph runtime lifecycle: construct, device ready, fit, settle, zoom, suspend. */
export class ColorGraphLifecycleMachine extends StateMachine<ColorGraphLifecycleState, ColorGraphLifecycleEvent> {
  static create(): ColorGraphLifecycleMachine {
    const result = new ColorGraphLifecycleMachine();

    return result;
  }

  getInitialState(): ColorGraphLifecycleState {
    const result = ColorGraphLifecycleState.idle();

    if (result.isDeviceReady()) {
      throw new Error('The color graph lifecycle must start before the device is ready');
    }

    return result;
  }

  reduce(state: ColorGraphLifecycleState, event: ColorGraphLifecycleEvent): FsmStepInterface<ColorGraphLifecycleState> {
    const result = {
      'effects': [],
      'state': event.transition(state)
    };

    return result;
  }
}
