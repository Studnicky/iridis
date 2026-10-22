import type { PaletteResolveRequestInterfaceTypeEntity } from './entities/PaletteResolveRequestInterfaceTypeEntity.ts';
import type { PaletteResolveHandlersInterface } from './interfaces/PaletteResolveHandlersInterface.ts';
import type { PaletteResolvePortInterface } from './interfaces/PaletteResolvePortInterface.ts';

import { PaletteResolveEnvelopeInterfaceTypeEntity } from './entities/PaletteResolveEnvelopeInterfaceTypeEntity.ts';
import { PaletteResolveReplyInterfaceTypeEntity } from './entities/PaletteResolveReplyInterfaceTypeEntity.ts';

/** Sends palette requests to a resolve port with latest-wins sequencing: one request in flight, only the newest one waiting, and only the newest outcome delivered. */
export class PaletteResolveClient {
  #alive = true;
  #inFlight: PaletteResolveEnvelopeInterfaceTypeEntity.Type | undefined;
  #newest: PaletteResolveEnvelopeInterfaceTypeEntity.Type | undefined;
  #sequence = 0;
  #waiting: PaletteResolveEnvelopeInterfaceTypeEntity.Type | undefined;
  readonly #handlers: PaletteResolveHandlersInterface;
  readonly #port: PaletteResolvePortInterface;

  public constructor(port: PaletteResolvePortInterface, handlers: PaletteResolveHandlersInterface) {
    this.#handlers = handlers;
    this.#port = port;
    port.listen((data) => { this.#receive(data); }, (message) => { this.#fail(message); });
  }

  public dispose(): void {
    this.#alive = false;
    this.#inFlight = undefined;
    this.#newest = undefined;
    this.#waiting = undefined;
    this.#handlers.idle();
    this.#port.terminate();
  }

  public request(request: PaletteResolveRequestInterfaceTypeEntity.Type): void {
    if (this.#alive) {
      this.#sequence += 1;
      const envelope = PaletteResolveEnvelopeInterfaceTypeEntity.create({ 'id': this.#sequence, 'request': request });
      this.#newest = envelope;
      this.#handlers.busy();
      if (this.#inFlight === undefined) {
        this.#dispatch(envelope);
      } else {
        this.#waiting = envelope;
      }
    }
  }

  #conclude(): void {
    this.#newest = undefined;
    this.#handlers.idle();
  }

  #dispatch(envelope: PaletteResolveEnvelopeInterfaceTypeEntity.Type): void {
    this.#inFlight = envelope;
    this.#waiting = undefined;
    this.#port.post(envelope);
  }

  #fail(message: string): void {
    const failed = this.#inFlight;
    if (this.#alive && failed !== undefined) {
      const isNewest = this.#newest?.id === failed.id;
      this.#release();
      if (isNewest) {
        this.#conclude();
        this.#handlers.reject(message);
      }
    }
  }

  #receive(data: unknown): void {
    if (this.#alive) {
      try {
        this.#settle(PaletteResolveReplyInterfaceTypeEntity.intake(data));
      } catch (error) {
        this.#fail(error instanceof Error ? error.message : String(error));
      }
    }
  }

  #release(): void {
    this.#inFlight = undefined;
    const waiting = this.#waiting;
    if (waiting !== undefined) {
      this.#dispatch(waiting);
    }
  }

  #settle(reply: PaletteResolveReplyInterfaceTypeEntity.Type): void {
    if (this.#inFlight?.id === reply.id) {
      const newest = this.#newest;
      this.#release();
      if (newest?.id === reply.id) {
        this.#conclude();
        if (reply.snapshot === undefined) {
          this.#handlers.reject(reply.failure ?? 'Palette resolve reply carried no snapshot');
        } else {
          this.#handlers.accept(reply.snapshot, newest.request);
        }
      }
    }
  }
}
