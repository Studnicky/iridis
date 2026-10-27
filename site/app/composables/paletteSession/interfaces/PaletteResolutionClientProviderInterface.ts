import type { WorkerHandlersInterface } from '../../interfaces/WorkerHandlersInterface.ts';
import type { PaletteResolutionClientInterface } from './PaletteResolutionClientInterface.ts';

/** Opens the resolution client for a session; the session supplies the handlers that receive lane failures. */
export interface PaletteResolutionClientProviderInterface {
  'open': (handlers: WorkerHandlersInterface) => PaletteResolutionClientInterface;
}
