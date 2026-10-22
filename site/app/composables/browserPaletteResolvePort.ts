import type { PaletteResolveEnvelopeInterfaceTypeEntity } from './entities/PaletteResolveEnvelopeInterfaceTypeEntity.ts';
import type { PaletteResolvePortInterface } from './interfaces/PaletteResolvePortInterface.ts';

/** Palette resolve port backed by a module Web Worker. */
export class BrowserPaletteResolvePort implements PaletteResolvePortInterface {
  readonly #worker: Worker;

  private constructor(worker: Worker) {
    this.#worker = worker;
  }

  public static open(): BrowserPaletteResolvePort {
    const worker = new Worker(new URL('../workers/paletteResolve.worker.ts', import.meta.url), { 'type': 'module' });
    const result = new BrowserPaletteResolvePort(worker);

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
      onFailure('Palette resolve reply could not be deserialized');
    });
  }

  public post(envelope: PaletteResolveEnvelopeInterfaceTypeEntity.Type): void {
    this.#worker.postMessage(envelope);
  }

  public terminate(): void {
    this.#worker.terminate();
  }
}
