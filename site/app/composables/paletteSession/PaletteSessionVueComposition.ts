import { LOG_STATUS, LogBody } from '@studnicky/logger/browser';
import * as VueModule from 'vue';

import type { PaletteResolutionClientProviderInterface } from './interfaces/PaletteResolutionClientProviderInterface.ts';
import type { PaletteSessionStore } from './PaletteSessionStore.ts';

import { logger } from '../logger.ts';
import { PaletteSessionComposition } from './PaletteSessionComposition.ts';
import { PaletteSessionImage } from './PaletteSessionImage.ts';
import { PaletteSessionInput } from './PaletteSessionInput.ts';
import { PaletteSessionReadModel } from './PaletteSessionReadModel.ts';
import { PaletteSessionStatusView } from './PaletteSessionStatusView.ts';

/** One reactive palette session per Nuxt app or SSR request, resolved from a WeakMap keyed by the app. */
export class PaletteSessionVueComposition {
  static readonly #instances = new WeakMap<object, PaletteSessionVueComposition>();

  public readonly readModel = VueModule.shallowRef(PaletteSessionReadModel.initial(PaletteSessionInput.initial(), PaletteSessionImage.initial()));
  public readonly status = VueModule.computed(() => {
    const result = PaletteSessionStatusView.from(this.readModel.value);
    return result;
  });

  public readonly error = VueModule.computed(() => {
    const result = this.status.value.error;
    return result;
  });

  public readonly paletteRevision = VueModule.computed(() => {
    const result = this.readModel.value.resolved?.revision ?? 0;
    return result;
  });

  public readonly resolving = VueModule.computed(() => {
    const result = this.status.value.resolving;
    return result;
  });

  public readonly running = VueModule.computed(() => {
    const result = this.status.value.running;
    return result;
  });

  readonly #scope: object;
  readonly #unsubscribe: () => void;
  public readonly store: PaletteSessionStore;

  private constructor(scope: object, store: PaletteSessionStore) {
    this.#scope = scope;
    this.store = store;
    this.readModel.value = store.readModel();
    this.#unsubscribe = store.subscribe((model) => { this.readModel.value = model; });
  }

  /** The browser opens the engine worker and the server resolves in-process, as `PaletteSessionComposition` decides. */
  public static resolve(scope: object, provider?: PaletteResolutionClientProviderInterface): PaletteSessionVueComposition {
    const existing = PaletteSessionVueComposition.#instances.get(scope);
    const result = existing ?? new PaletteSessionVueComposition(scope, PaletteSessionComposition.resolve(scope, provider));
    PaletteSessionVueComposition.#instances.set(scope, result);
    return result;
  }

  /** Admits the command, stamps it, and applies it; a rejected command is logged and dropped. Settles once every subscriber holds the resulting read model. */
  public readonly dispatch = async (command: unknown): Promise<void> => {
    try {
      this.store.publishIntent(this.store.createIntent(command));
    } catch {
      logger.error(
        LogBody.create({
          'component': 'PaletteSessionVueComposition',
          'context': {},
          'message': 'Palette session command was rejected',
          'operation': 'dispatch',
          'status': LOG_STATUS.FAILED
        })
      );
    }
    await this.store.settled();
  };

  public async dispose(): Promise<void> {
    this.#unsubscribe();
    PaletteSessionVueComposition.#instances.delete(this.#scope);
    await PaletteSessionComposition.release(this.#scope);
  }
}
