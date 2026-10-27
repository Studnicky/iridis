import { EventBus } from '@studnicky/event-bus/browser';
import { EffectInterpreter } from '@studnicky/fsm/browser';
import {
  LOG_STATUS, LogBody
} from '@studnicky/logger/browser';

import type { PresentationControlsEffectEntity } from './entities/PresentationControlsEffectEntity.ts';
import type { PresentationControlsReadModelEntity } from './entities/PresentationControlsReadModelEntity.ts';
import type { PresentationControlsEffectHandlersInterface } from './interfaces/PresentationControlsEffectHandlersInterface.ts';
import type { PresentationControlsTopicsInterface } from './interfaces/PresentationControlsTopicsInterface.ts';

import { logger } from '../logger.ts';
import { PresentationControlCommandEntity } from './entities/PresentationControlCommandEntity.ts';
import { PresentationControlIntentEntity } from './entities/PresentationControlIntentEntity.ts';
import { PresentationControlsMachine } from './PresentationControlsMachine.ts';

/** Request-scoped display-control port: admits commands, reduces them through the FSM, and fans the read model out. */
export class PresentationControlsStore {
  readonly #bus = EventBus.create<PresentationControlsTopicsInterface>({ 'highWaterMark': 16 });

  readonly #interpreter = EffectInterpreter.create(PresentationControlsMachine.create(), {
    'handler': (effect: PresentationControlsEffectEntity.Type): void => {
      this.#execute(effect);
    }
  });

  readonly #subscriptions = new Set<() => void>();

  #disposed = false;

  #handlers: PresentationControlsEffectHandlersInterface | undefined;

  #model: PresentationControlsReadModelEntity.Type;

  #sequence = 0;

  private constructor() {
    this.#interpreter.start();
    this.#model = this.#interpreter.getState();
    this.#interpreter.subscribe((next) => {
      this.#model = next;
    });
  }

  public static create(): PresentationControlsStore {
    const result = new PresentationControlsStore();

    return result;
  }

  public createIntent(command: unknown): PresentationControlIntentEntity.Type {
    this.#assertActive();
    const admitted = PresentationControlCommandEntity.intake(command);

    this.#sequence += 1;
    const result = PresentationControlIntentEntity.create({
      'command': admitted,
      'sequence': this.#sequence
    });

    return result;
  }

  public async dispose(): Promise<void> {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    for (const unsubscribe of this.#subscriptions) {
      unsubscribe();
    }
    this.#subscriptions.clear();
    this.#interpreter.stop();
    await this.#bus.close();
  }

  public async publishIntent(intent: PresentationControlIntentEntity.Type): Promise<void> {
    this.#assertActive();
    const admitted = PresentationControlIntentEntity.intake(intent);
    const revision = this.#model.revision;

    await this.#interpreter.send(PresentationControlsMachine.eventFor(admitted));
    if (this.#model.revision !== revision) {
      await this.#bus.publish('presentation.controls.read-model', this.#model);
    }
  }

  public readModel(): PresentationControlsReadModelEntity.Type {
    return this.#model;
  }

  public registerEffectHandlers(handlers: PresentationControlsEffectHandlersInterface): void {
    this.#handlers = handlers;
  }

  public subscribe(listener: (model: PresentationControlsReadModelEntity.Type) => void): () => void {
    this.#assertActive();
    const unsubscribeBus = this.#bus.subscribe('presentation.controls.read-model', listener);
    const unsubscribe = (): void => {
      this.#subscriptions.delete(unsubscribe);
      unsubscribeBus();
    };

    this.#subscriptions.add(unsubscribe);

    return unsubscribe;
  }

  #assertActive(): void {
    if (this.#disposed) {
      throw new Error('Presentation controls store is disposed');
    }
  }

  #execute(effect: PresentationControlsEffectEntity.Type): void {
    try {
      this.#handlers?.navigateToTarget(effect.navigationTarget);
    } catch {
      logger.error(
        LogBody.create({
          'component': 'PresentationControlsStore',
          'context': {},
          'message': `Effect handler for "${effect.variant}" threw`,
          'operation': 'execute',
          'status': LOG_STATUS.FAILED
        })
      );
    }
  }
}
