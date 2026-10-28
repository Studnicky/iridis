import type { WorkerReplyEntity } from '../../app/composables/entities/WorkerReplyEntity.ts';
import type { EngineWorkerScopeInterface } from '../../app/composables/interfaces/EngineWorkerScopeInterface.ts';

import { EngineWorkerHost } from '../../app/workers/EngineWorkerHost.ts';

/** The worker-side scope: delivers posted messages to the engine host and returns its replies. */
class FakeEngineScope implements EngineWorkerScopeInterface {
  readonly #listeners: ((event: MessageEvent<unknown>) => void)[] = [];
  readonly #replyTo: (reply: WorkerReplyEntity.Type) => void;

  public constructor(replyTo: (reply: WorkerReplyEntity.Type) => void) {
    this.#replyTo = replyTo;
  }

  public addEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void): void {
    this.#listeners.push(listener);
  }

  public deliver(data: unknown): void {
    const event = new MessageEvent('message', { 'data': data, 'origin': '' });
    this.#listeners.forEach((listener) => { listener(event); });
  }

  public postMessage(reply: WorkerReplyEntity.Type): void {
    this.#replyTo(reply);
  }
}

/** A `Worker` replacement that runs the real engine host in-process and records what the page posts to it. */
export class FakeEngineWorker {
  public static readonly instances = new Set<number>();
  public static readonly posted: { 'imageId'?: string; 'kind': string }[] = [];
  public static readonly transferred: ArrayBuffer[] = [];
  public terminated = false;
  readonly #messageListeners: ((event: { readonly 'data': unknown }) => void)[] = [];
  readonly #scope: FakeEngineScope;

  public constructor() {
    FakeEngineWorker.instances.add(FakeEngineWorker.instances.size);
    this.#scope = new FakeEngineScope((reply) => {
      const cloned = structuredClone(reply);
      queueMicrotask(() => { this.#messageListeners.forEach((listener) => { listener({ 'data': cloned }); }); });
    });
    EngineWorkerHost.start(this.#scope);
  }

  public static count(kind: string, imageId?: string): number {
    const matching = FakeEngineWorker.posted.filter((message) => {
      const same = message.kind === kind && (imageId === undefined || message.imageId === imageId);
      return same;
    });
    return matching.length;
  }

  public static reset(): void {
    FakeEngineWorker.instances.clear();
    FakeEngineWorker.posted.length = 0;
    FakeEngineWorker.transferred.length = 0;
  }

  public addEventListener(type: string, listener: (event: { readonly 'data': unknown }) => void): void {
    if (type === 'message') {
      this.#messageListeners.push(listener);
    }
  }

  public postMessage(data: unknown, transfer: Transferable[] = []): void {
    const message = structuredClone(data, { 'transfer': transfer });
    if (message instanceof ArrayBuffer) {
      FakeEngineWorker.transferred.push(message);
    } else if (typeof message === 'object' && message !== null && 'message' in message) {
      const inner = message.message;
      if (typeof inner === 'object' && inner !== null && 'kind' in inner && typeof inner.kind === 'string') {
        const imageId = 'imageId' in inner && typeof inner.imageId === 'string' ? { 'imageId': inner.imageId } : {};
        FakeEngineWorker.posted.push({ ...imageId, 'kind': inner.kind });
      }
    }
    queueMicrotask(() => { this.#scope.deliver(message); });
  }

  public terminate(): void {
    this.terminated = true;
  }
}
