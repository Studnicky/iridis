import type { FsmStepInterface } from '@studnicky/fsm/browser';

import type { PaletteSnapshotEntity } from '../../entities/PaletteSnapshotEntity.ts';
import type { PaletteSessionInputEntity } from '../entities/PaletteSessionInputEntity.ts';

import { PaletteSessionEffect } from './PaletteSessionEffect.ts';

/** Where a revision stands; each state decides how it answers the machine's events. */
export abstract class PaletteSessionState {
  abstract readonly variant: string;
  readonly correlationId: string;
  readonly input: PaletteSessionInputEntity.Type;
  readonly message: string | undefined;
  readonly revision: number;

  protected constructor(revision: number, correlationId: string, input: PaletteSessionInputEntity.Type, message: string | undefined) {
    this.correlationId = correlationId;
    this.input = input;
    this.message = message;
    this.revision = revision;
  }

  static initial(input: PaletteSessionInputEntity.Type): PaletteSessionState {
    const result = new IdlePaletteSessionState(0, 'session', input);
    return result;
  }

  onFailed(_revision: number, _message: string): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    const result = { 'effects': [], 'state': this.retain() };
    return result;
  }

  onPublished(revision: number, correlationId: string, input: PaletteSessionInputEntity.Type): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    const result = { 'effects': [PaletteSessionEffect.settle()], 'state': new SettlingPaletteSessionState(revision, correlationId, input) };
    return result;
  }

  onSettled(): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    const result = { 'effects': [], 'state': this.retain() };
    return result;
  }

  onSucceeded(_revision: number, _snapshot: PaletteSnapshotEntity.Type): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    const result = { 'effects': [], 'state': this.retain() };
    return result;
  }

  abstract retain(): PaletteSessionState;
}

class IdlePaletteSessionState extends PaletteSessionState {
  readonly variant: string = 'idle';

  constructor(revision: number, correlationId: string, input: PaletteSessionInputEntity.Type) {
    super(revision, correlationId, input, undefined);
  }

  retain(): PaletteSessionState {
    const result = new IdlePaletteSessionState(this.revision, this.correlationId, this.input);
    return result;
  }
}

class FailedPaletteSessionState extends PaletteSessionState {
  readonly variant: string = 'failed';

  constructor(revision: number, correlationId: string, input: PaletteSessionInputEntity.Type, message: string) {
    super(revision, correlationId, input, message);
  }

  retain(): PaletteSessionState {
    const result = new FailedPaletteSessionState(this.revision, this.correlationId, this.input, this.message ?? '');
    return result;
  }
}

class SettlingPaletteSessionState extends PaletteSessionState {
  readonly variant: string = 'settling';

  constructor(revision: number, correlationId: string, input: PaletteSessionInputEntity.Type) {
    super(revision, correlationId, input, undefined);
  }

  override onPublished(revision: number, correlationId: string, input: PaletteSessionInputEntity.Type): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    const result = { 'effects': [], 'state': new SettlingPaletteSessionState(revision, correlationId, input) };
    return result;
  }

  override onSettled(): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    const result = {
      'effects': [PaletteSessionEffect.submit(this.revision, this.correlationId, this.input)],
      'state': new ResolvingPaletteSessionState(this.revision, this.correlationId, this.input)
    };
    return result;
  }

  retain(): PaletteSessionState {
    const result = new SettlingPaletteSessionState(this.revision, this.correlationId, this.input);
    return result;
  }
}

class ResolvingPaletteSessionState extends PaletteSessionState {
  readonly variant: string = 'resolving';

  constructor(revision: number, correlationId: string, input: PaletteSessionInputEntity.Type) {
    super(revision, correlationId, input, undefined);
  }

  override onFailed(revision: number, message: string): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    let result = super.onFailed(revision, message);
    if (revision === this.revision) {
      result = {
        'effects': [PaletteSessionEffect.fail(revision, this.correlationId, message)],
        'state': new FailedPaletteSessionState(this.revision, this.correlationId, this.input, message)
      };
    }
    return result;
  }

  override onSucceeded(revision: number, snapshot: PaletteSnapshotEntity.Type): FsmStepInterface<PaletteSessionState, PaletteSessionEffect> {
    let result = super.onSucceeded(revision, snapshot);
    if (revision === this.revision) {
      result = {
        'effects': [PaletteSessionEffect.publish(revision, this.correlationId, this.input, snapshot)],
        'state': new IdlePaletteSessionState(this.revision, this.correlationId, this.input)
      };
    }
    return result;
  }

  retain(): PaletteSessionState {
    const result = new ResolvingPaletteSessionState(this.revision, this.correlationId, this.input);
    return result;
  }
}
