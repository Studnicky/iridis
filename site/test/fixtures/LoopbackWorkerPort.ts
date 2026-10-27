import type { WorkerEnvelopeEntity } from '../../app/composables/entities/WorkerEnvelopeEntity.ts';
import type { WorkerPortInterface } from '../../app/composables/interfaces/WorkerPortInterface.ts';

import { EngineWorkerHost } from '../../app/workers/EngineWorkerHost.ts';

/** Worker port that answers through the real engine host in a later microtask, like a worker thread would. */
export class LoopbackWorkerPort implements WorkerPortInterface {
  #onReply: (data: unknown) => void = () => {};

  public listen(onReply: (data: unknown) => void, _onFailure: (message: string) => void): void {
    this.#onReply = onReply;
  }

  public post(envelope: WorkerEnvelopeEntity.Type): void {
    const reply = EngineWorkerHost.receive(structuredClone(envelope));
    if (reply !== undefined) {
      queueMicrotask(() => { this.#onReply(structuredClone(reply)); });
    }
  }

  public terminate(): void {
    this.#onReply = () => {};
  }

  public transfer(_pixels: ArrayBuffer): void {
    // Palette sessions send no pixel buffers.
  }
}
