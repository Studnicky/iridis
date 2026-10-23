import type { WorkerEnvelopeEntity } from '../entities/WorkerEnvelopeEntity.ts';

/** Transport to the engine worker; replies and failures arrive through the listeners registered by `listen`. `transfer` moves a pixel buffer ahead of the `pixels` envelope that claims it. */
export interface WorkerPortInterface {
  'listen': (onReply: (data: unknown) => void, onFailure: (message: string) => void) => void;
  'post': (envelope: WorkerEnvelopeEntity.Type) => void;
  'terminate': () => void;
  'transfer': (pixels: ArrayBuffer) => void;
}
