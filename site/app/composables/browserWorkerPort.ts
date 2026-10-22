import type { WorkerEnvelopeEntity } from './entities/WorkerEnvelopeEntity.ts';
import type { WorkerPortInterface } from './interfaces/WorkerPortInterface.ts';

/** Engine worker port backed by a module Web Worker. */
export class BrowserWorkerPort implements WorkerPortInterface {
  readonly #worker: Worker;

  private constructor(worker: Worker) {
    this.#worker = worker;
  }

  public static open(): BrowserWorkerPort {
    const worker = new Worker(new URL('../workers/colorEngine.worker.ts', import.meta.url), { 'type': 'module' });
    const result = new BrowserWorkerPort(worker);

    return result;
  }

  public listen(onReply: (data: unknown) => void, onFailure: (message: string) => void): void {
    this.#worker.addEventListener('message', (event: MessageEvent<unknown>) => {
      onReply(event.data);
    });
    this.#worker.addEventListener('error', (event: ErrorEvent) => {
      onFailure(event.message);
    });
    this.#worker.addEventListener('messageerror', () => {
      onFailure('Worker reply could not be deserialized');
    });
  }

  public post(envelope: WorkerEnvelopeEntity.Type): void {
    this.#worker.postMessage(envelope);
  }

  public terminate(): void {
    this.#worker.terminate();
  }

  public transfer(pixels: ArrayBuffer): void {
    this.#worker.postMessage(pixels, [pixels]);
  }
}
