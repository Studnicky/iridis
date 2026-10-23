import type { EngineWorkerScopeInterface } from '../composables/interfaces/EngineWorkerScopeInterface.ts';

import { WorkerEnvelopeEntity } from '../composables/entities/WorkerEnvelopeEntity.ts';
import { WorkerReplyEntity } from '../composables/entities/WorkerReplyEntity.ts';
import { ImageExtract } from '../composables/imageExtract.ts';
import { ImagePixels } from '../composables/imagePixels.ts';
import { PaletteResolve } from '../composables/paletteResolve.ts';

/** Worker transport: lane messages answer with a result or failure for the same id; `pixels` and `release` commands maintain the worker-owned pixel cache and answer nothing. A raw ArrayBuffer message is the buffer the next `pixels` command claims. */
export class EngineWorkerHost {
  private static pending: ArrayBuffer | undefined;
  private static readonly pixels = new Map<string, ImagePixels>();

  private static failure(envelope: WorkerEnvelopeEntity.Type, failure: string): WorkerReplyEntity.Type {
    const message = envelope.message;
    const reply = message.kind === 'extract' || message.kind === 'combine'
      ? WorkerReplyEntity.create({ 'failure': failure, 'id': envelope.id, 'kind': message.kind })
      : WorkerReplyEntity.create({ 'failure': failure, 'id': envelope.id, 'kind': 'palette' });
    return reply;
  }

  private static lane(envelope: WorkerEnvelopeEntity.Type): WorkerReplyEntity.Type {
    const { id, message } = envelope;
    let reply: WorkerReplyEntity.Type;
    if (message.kind === 'palette') {
      reply = WorkerReplyEntity.create({ 'id': id, 'kind': 'palette', 'snapshot': PaletteResolve.run(message.request) });
    } else if (message.kind === 'extract') {
      const pixels = EngineWorkerHost.pixels.get(message.imageId);
      if (pixels === undefined) {
        throw new RangeError(`Worker holds no pixels for image ${message.imageId}`);
      }
      reply = WorkerReplyEntity.create({ 'id': id, 'kind': 'extract', 'result': ImageExtract.extract(message.settings, pixels) });
    } else if (message.kind === 'combine') {
      reply = WorkerReplyEntity.create({ 'id': id, 'kind': 'combine', 'result': ImageExtract.combine(message) });
    } else {
      throw new RangeError(`Worker message ${message.kind} is not a lane message`);
    }
    return reply;
  }

  public static receive(envelope: WorkerEnvelopeEntity.Type): WorkerReplyEntity.Type | undefined {
    const message = envelope.message;
    let reply: WorkerReplyEntity.Type | undefined;
    if (message.kind === 'pixels') {
      if (EngineWorkerHost.pending !== undefined) {
        EngineWorkerHost.pixels.set(message.imageId, new ImagePixels(EngineWorkerHost.pending, message.height, message.width));
      }
      EngineWorkerHost.pending = undefined;
    } else if (message.kind === 'release') {
      EngineWorkerHost.pixels.delete(message.imageId);
    } else {
      try {
        reply = EngineWorkerHost.lane(envelope);
      } catch (error) {
        reply = EngineWorkerHost.failure(envelope, error instanceof Error ? error.message : String(error));
      }
    }
    return reply;
  }

  /** A dedicated worker only receives messages from its owner, whose events carry an empty origin. */
  public static start(scope: EngineWorkerScopeInterface): void {
    scope.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (event.origin === '') {
        if (event.data instanceof ArrayBuffer) {
          EngineWorkerHost.pending = event.data;
        } else {
          const reply = EngineWorkerHost.receive(WorkerEnvelopeEntity.intake(event.data));
          if (reply !== undefined) {
            scope.postMessage(reply);
          }
        }
      }
    });
  }
}
