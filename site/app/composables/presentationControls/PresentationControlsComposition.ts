import { LOG_STATUS, LogBody } from '@studnicky/logger/browser';
import * as VueModule from 'vue';

import { logger } from '../logger.ts';
import { PresentationControlsStore } from './PresentationControlsStore.ts';

/** One store and reactive read model per Nuxt app or SSR request, resolved from a WeakMap keyed by the app. */
export class PresentationControlsComposition {
  static readonly #instances = new WeakMap<object, PresentationControlsComposition>();

  public readonly store = PresentationControlsStore.create();
  public readonly readModel = VueModule.shallowRef(this.store.readModel());

  private constructor() {
    this.store.subscribe((model) => { this.readModel.value = model; });
  }

  public static resolve(scope: object): PresentationControlsComposition {
    const existing = PresentationControlsComposition.#instances.get(scope);
    if (existing !== undefined) {
      return existing;
    }
    const created = new PresentationControlsComposition();
    PresentationControlsComposition.#instances.set(scope, created);
    return created;
  }

  public readonly dispatch = async (command: unknown): Promise<void> => {
    try {
      await this.store.publishIntent(this.store.createIntent(command));
      this.readModel.value = this.store.readModel();
    } catch {
      logger.error(
        LogBody.create({
          'component': 'PresentationControlsComposition',
          'context': {},
          'message': 'Presentation control command was rejected',
          'operation': 'dispatch',
          'status': LOG_STATUS.FAILED
        })
      );
    }
  };
}
