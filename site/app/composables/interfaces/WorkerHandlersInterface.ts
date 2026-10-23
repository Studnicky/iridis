import type { WorkerEnvelopeEntity } from '../entities/WorkerEnvelopeEntity.ts';
import type { WorkerMessageEntity } from '../entities/WorkerMessageEntity.ts';
import type { WorkerReplyEntity } from '../entities/WorkerReplyEntity.ts';

/** Receives the outcome of the newest request of each lane and the busy and idle transitions of every lane. */
export interface WorkerHandlersInterface {
  accept(reply: WorkerReplyEntity.Type, envelope: WorkerEnvelopeEntity.Type): void;
  busy(message: WorkerMessageEntity.Type): void;
  idle(message: WorkerMessageEntity.Type): void;
  reject(message: string): void;
}
