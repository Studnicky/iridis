import { EffectInterpreter } from '@studnicky/fsm/browser';
import { LOG_STATUS, LogBody } from '@studnicky/logger/browser';

import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';
import type { PaletteSessionEffect } from './fsm/PaletteSessionEffect.ts';
import type { PaletteSessionEvent } from './fsm/PaletteSessionEvent.ts';
import type { PaletteSessionState } from './fsm/PaletteSessionState.ts';
import type { PaletteSessionEffectHandlersInterface } from './interfaces/PaletteSessionEffectHandlersInterface.ts';

import { logger } from '../logger.ts';
import { PaletteSessionMachine } from './fsm/PaletteSessionMachine.ts';

/** Owns the palette FSM interpreter; effects run against the handler port registered after construction. */
export class PaletteSessionRuntime {
  #handlers: PaletteSessionEffectHandlersInterface | undefined;
  readonly #interpreter: EffectInterpreter<PaletteSessionState, PaletteSessionEvent, PaletteSessionEffect>;

  readonly #handleEffect = (effect: PaletteSessionEffect): void => {
    const handlers = this.#handlers;
    if (handlers === undefined) {
      throw new Error(`Cannot execute palette effect "${effect.variant}" before its handlers are registered`);
    }
    effect.execute(handlers);
  };

  public constructor(initial: PaletteSessionInputEntity.Type) {
    this.#interpreter = EffectInterpreter.create(new PaletteSessionMachine(initial), { 'handler': this.#handleEffect });
    this.#interpreter.start();
  }

  public dispose(): void {
    this.#interpreter.stop();
  }

  public register(handlers: PaletteSessionEffectHandlersInterface): void {
    this.#handlers = handlers;
  }

  public send(event: PaletteSessionEvent): void {
    this.#interpreter.send(event).catch(() => {
      logger.error(
        LogBody.create({
          'component': 'PaletteSessionRuntime',
          'context': {},
          'message': `Palette FSM rejected event "${event.type}"`,
          'operation': 'send',
          'status': LOG_STATUS.FAILED
        })
      );
    });
  }
}
