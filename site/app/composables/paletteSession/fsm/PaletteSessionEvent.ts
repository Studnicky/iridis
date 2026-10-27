import type { FsmStepInterface } from '@studnicky/fsm/browser';

import type { PaletteSnapshotEntity } from '../../entities/PaletteSnapshotEntity.ts';
import type { PaletteSessionInputEntity } from '../entities/PaletteSessionInputEntity.ts';
import type { PaletteSessionEffect } from './PaletteSessionEffect.ts';
import type { PaletteSessionState } from './PaletteSessionState.ts';

/** A lifecycle fact delivered to the palette machine; the state it lands on decides the transition. */
export abstract class PaletteSessionEvent {
  abstract readonly type: string;

  static failed(revision: number, message: string): PaletteSessionEvent {
    const result = new FailedEvent(revision, message);
    return result;
  }

  static published(revision: number, correlationId: string, input: PaletteSessionInputEntity.Type): PaletteSessionEvent {
    const result = new PublishedEvent(revision, correlationId, input);
    return result;
  }

  static settled(): PaletteSessionEvent {
    const result = new SettledEvent();
    return result;
  }

  static succeeded(revision: number, snapshot: PaletteSnapshotEntity.Type): PaletteSessionEvent {
    const result = new SucceededEvent(revision, snapshot);
    return result;
  }

  abstract transition(state: PaletteSessionState): FsmStepInterface<PaletteSessionState, PaletteSessionEffect>;
}

class FailedEvent extends PaletteSessionEvent {
  readonly type: string = 'RESOLUTION_FAILED';

  constructor(
    private readonly revision: number,
    private readonly message: string
  ) { super(); }

  transition(state: PaletteSessionState): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    const result = state.onFailed(this.revision, this.message);
    return result;
  }
}

class PublishedEvent extends PaletteSessionEvent {
  readonly type: string = 'REVISION_PUBLISHED';

  constructor(
    private readonly revision: number,
    private readonly correlationId: string,
    private readonly input: PaletteSessionInputEntity.Type
  ) { super(); }

  transition(state: PaletteSessionState): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    const result = state.onPublished(this.revision, this.correlationId, this.input);
    return result;
  }
}

class SettledEvent extends PaletteSessionEvent {
  readonly type: string = 'TICK_SETTLED';

  transition(state: PaletteSessionState): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    const result = state.onSettled();
    return result;
  }
}

class SucceededEvent extends PaletteSessionEvent {
  readonly type: string = 'RESOLUTION_SUCCEEDED';

  constructor(
    private readonly revision: number,
    private readonly snapshot: PaletteSnapshotEntity.Type
  ) { super(); }

  transition(state: PaletteSessionState): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    const result = state.onSucceeded(this.revision, this.snapshot);
    return result;
  }
}
