import type { WorkerMessageEntity } from './entities/WorkerMessageEntity.ts';
import type { WorkerHandlersInterface } from './interfaces/WorkerHandlersInterface.ts';
import type { WorkerPortInterface } from './interfaces/WorkerPortInterface.ts';

import { WorkerEnvelopeEntity } from './entities/WorkerEnvelopeEntity.ts';
import { WorkerReplyEntity } from './entities/WorkerReplyEntity.ts';

/** One supersession queue: one request in flight, only the newest one waiting, only the newest outcome delivered. */
class RequestLane {
  public inFlight: WorkerEnvelopeEntity.Type | undefined;
  public readonly message: WorkerMessageEntity.Type;
  public newest: WorkerEnvelopeEntity.Type | undefined;
  public waiting: WorkerEnvelopeEntity.Type | undefined;

  public constructor(message: WorkerMessageEntity.Type) {
    this.message = message;
  }
}

/** Sends messages to the engine worker with latest-wins sequencing per independent request lane; a superseded or cancelled reply is discarded. */
export class WorkerRequestClient {
  #alive = true;
  readonly #flights = new Map<number, string>();
  readonly #handlers: WorkerHandlersInterface;
  readonly #lanes = new Map<string, RequestLane>();
  readonly #loaded = new Set<string>();
  readonly #port: WorkerPortInterface;
  #sequence = 0;
  readonly #settlers = new Map<number, (reply: WorkerReplyEntity.Type | undefined) => void>();

  public constructor(port: WorkerPortInterface, handlers: WorkerHandlersInterface) {
    this.#handlers = handlers;
    this.#port = port;
    port.listen((data) => { this.#receive(data); }, (message) => { this.#failAll(message); });
  }

  private static laneKey(message: WorkerMessageEntity.Type): string | undefined {
    let lane: string | undefined;
    if (message.kind === 'extract') {
      lane = `extract:${message.imageId}`;
    } else if (message.kind === 'palette' || message.kind === 'combine' || message.kind === 'schema-feasibility') {
      lane = message.kind;
    }
    return lane;
  }

  public cancelCombine(): void {
    this.#cancel('combine');
  }

  public dispose(): void {
    this.#alive = false;
    const lanes = [...this.#lanes.values()];
    this.#lanes.clear();
    this.#flights.clear();
    this.#loaded.clear();
    for (let index = 0; index < lanes.length; index += 1) {
      const lane = lanes[index];
      if (lane !== undefined) {
        this.#handlers.idle(lane.message);
      }
    }
    const settlers = [...this.#settlers.values()];
    this.#settlers.clear();
    for (let index = 0; index < settlers.length; index += 1) {
      settlers[index]?.(undefined);
    }
    this.#port.terminate();
  }

  public holdsPixels(imageId: string): boolean {
    const result = this.#loaded.has(imageId);
    return result;
  }

  /** Resolves with the reply once it was delivered to the handlers, and with undefined when the request was superseded, cancelled, failed, answered by no reply, or the client was disposed. A `pixels` message carries the transferred buffer. */
  public request(message: WorkerMessageEntity.Type, pixels?: ArrayBuffer): Promise<WorkerReplyEntity.Type | undefined> {
    const result = new Promise<WorkerReplyEntity.Type | undefined>((resolve) => {
      if (this.#alive) {
        this.#sequence += 1;
        const envelope = WorkerEnvelopeEntity.create({ 'id': this.#sequence, 'message': message });
        const lane = WorkerRequestClient.laneKey(message);
        if (typeof lane === 'string') {
          this.#settlers.set(envelope.id, resolve);
          this.#enqueue(lane, envelope);
        } else {
          this.#command(envelope, pixels);
          resolve(undefined);
        }
      } else {
        resolve(undefined);
      }
    });
    return result;
  }

  #cancel(key: string): void {
    const lane = this.#lanes.get(key);
    if (lane !== undefined) {
      if (lane.waiting !== undefined) {
        this.#finish(lane.waiting.id, undefined);
      }
      lane.waiting = undefined;
      lane.newest = undefined;
      this.#conclude(key, lane);
    }
  }

  #command(envelope: WorkerEnvelopeEntity.Type, pixels: ArrayBuffer | undefined): void {
    const message = envelope.message;
    if (message.kind === 'pixels') {
      this.#loaded.add(message.imageId);
    } else if (message.kind === 'release') {
      this.#loaded.delete(message.imageId);
      this.#cancel(`extract:${message.imageId}`);
    }
    if (pixels instanceof ArrayBuffer) {
      this.#port.transfer(pixels);
    }
    this.#port.post(envelope);
  }

  #conclude(key: string, lane: RequestLane): void {
    if (lane.inFlight === undefined) {
      lane.newest = undefined;
      this.#lanes.delete(key);
      this.#handlers.idle(lane.message);
    }
  }

  #dispatch(key: string, lane: RequestLane, envelope: WorkerEnvelopeEntity.Type): void {
    lane.inFlight = envelope;
    lane.waiting = undefined;
    this.#flights.set(envelope.id, key);
    this.#port.post(envelope);
  }

  #enqueue(key: string, envelope: WorkerEnvelopeEntity.Type): void {
    const existing = this.#lanes.get(key);
    const lane = existing ?? new RequestLane(envelope.message);
    if (existing === undefined) {
      this.#lanes.set(key, lane);
      this.#handlers.busy(lane.message);
    }
    if (lane.waiting !== undefined) {
      this.#finish(lane.waiting.id, undefined);
    }
    lane.newest = envelope;
    if (lane.inFlight === undefined) {
      this.#dispatch(key, lane, envelope);
    } else {
      lane.waiting = envelope;
    }
  }

  #failAll(message: string): void {
    if (this.#alive) {
      const entries = [...this.#lanes.entries()];
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        if (entry !== undefined) {
          this.#failLane(entry[0], entry[1], message);
        }
      }
    }
  }

  #failLane(key: string, lane: RequestLane, message: string): void {
    const failed = lane.inFlight;
    if (failed !== undefined) {
      const isNewest = lane.newest?.id === failed.id;
      this.#release(key, lane);
      this.#conclude(key, lane);
      this.#finish(failed.id, undefined);
      if (isNewest) {
        this.#handlers.reject(message);
      }
    }
  }

  #finish(id: number, reply: WorkerReplyEntity.Type | undefined): void {
    const settle = this.#settlers.get(id);
    this.#settlers.delete(id);
    settle?.(reply);
  }

  #receive(data: unknown): void {
    if (this.#alive) {
      try {
        this.#settle(WorkerReplyEntity.intake(data));
      } catch (error) {
        this.#failAll(error instanceof Error ? error.message : String(error));
      }
    }
  }

  #release(key: string, lane: RequestLane): void {
    if (lane.inFlight !== undefined) {
      this.#flights.delete(lane.inFlight.id);
    }
    lane.inFlight = undefined;
    const waiting = lane.waiting;
    if (waiting !== undefined) {
      this.#dispatch(key, lane, waiting);
    }
  }

  #settle(reply: WorkerReplyEntity.Type): void {
    const key = this.#flights.get(reply.id);
    const lane = typeof key === 'string' ? this.#lanes.get(key) : undefined;
    if (typeof key === 'string' && lane?.inFlight?.id === reply.id) {
      const newest = lane.newest;
      this.#release(key, lane);
      this.#conclude(key, lane);
      let delivered: WorkerReplyEntity.Type | undefined;
      if (newest?.id === reply.id) {
        if (reply.failure === undefined) {
          this.#handlers.accept(reply, newest);
          delivered = reply;
        } else {
          this.#handlers.reject(reply.failure);
        }
      }
      this.#finish(reply.id, delivered);
    }
  }
}
