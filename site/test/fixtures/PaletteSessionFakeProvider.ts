import type { WorkerHandlersInterface } from '../../app/composables/interfaces/WorkerHandlersInterface.ts';
import type { PaletteResolutionClientInterface } from '../../app/composables/paletteSession/interfaces/PaletteResolutionClientInterface.ts';
import type { PaletteResolutionClientProviderInterface } from '../../app/composables/paletteSession/interfaces/PaletteResolutionClientProviderInterface.ts';

import { PaletteSessionFakeClient } from './PaletteSessionFakeClient.ts';

/** Opens the fake client and keeps the lane handlers the session registered. */
export class PaletteSessionFakeProvider implements PaletteResolutionClientProviderInterface {
  public readonly client = new PaletteSessionFakeClient();
  public handlers: WorkerHandlersInterface | undefined;

  public open(handlers: WorkerHandlersInterface): PaletteResolutionClientInterface {
    this.handlers = handlers;
    return this.client;
  }
}
