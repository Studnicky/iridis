import type { WorkerHandlersInterface } from '../interfaces/WorkerHandlersInterface.ts';
import type { PaletteResolutionClientInterface } from './interfaces/PaletteResolutionClientInterface.ts';
import type { PaletteResolutionClientProviderInterface } from './interfaces/PaletteResolutionClientProviderInterface.ts';

import { BrowserWorkerPort } from '../browserWorkerPort.ts';
import { WorkerRequestClient } from '../workerRequestClient.ts';
import { PaletteSessionStore } from './PaletteSessionStore.ts';
import { SynchronousPaletteClient } from './SynchronousPaletteClient.ts';

class BrowserClientProvider implements PaletteResolutionClientProviderInterface {
  public open(handlers: WorkerHandlersInterface): PaletteResolutionClientInterface {
    const result = new WorkerRequestClient(BrowserWorkerPort.open(), handlers);
    return result;
  }
}

class ServerClientProvider implements PaletteResolutionClientProviderInterface {
  public open(_handlers: WorkerHandlersInterface): PaletteResolutionClientInterface {
    const result = new SynchronousPaletteClient();
    return result;
  }
}

/** Holds one palette session per Nuxt app; requests never share a session. */
export class PaletteSessionComposition {
  static readonly #stores = new WeakMap<object, PaletteSessionStore>();

  public static release(nuxtApp: object): Promise<void> {
    const store = PaletteSessionComposition.#stores.get(nuxtApp);
    PaletteSessionComposition.#stores.delete(nuxtApp);
    const result = store === undefined ? Promise.resolve() : store.dispose();
    return result;
  }

  /** The browser opens the engine worker; the server resolves in-process. */
  public static resolve(nuxtApp: object, provider?: PaletteResolutionClientProviderInterface): PaletteSessionStore {
    let store = PaletteSessionComposition.#stores.get(nuxtApp);
    if (store === undefined) {
      store = new PaletteSessionStore(provider ?? PaletteSessionComposition.#defaultProvider());
      PaletteSessionComposition.#stores.set(nuxtApp, store);
    }
    return store;
  }

  static #defaultProvider(): PaletteResolutionClientProviderInterface {
    const result = typeof window === 'undefined' ? new ServerClientProvider() : new BrowserClientProvider();
    return result;
  }
}
