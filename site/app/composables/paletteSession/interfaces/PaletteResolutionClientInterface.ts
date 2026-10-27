import type { WorkerMessageEntity } from '../../entities/WorkerMessageEntity.ts';
import type { WorkerReplyEntity } from '../../entities/WorkerReplyEntity.ts';

/** Submits lane messages and resolves with the delivered reply, or undefined when the request was superseded, failed, or the client was disposed; `WorkerRequestClient` satisfies it. */
export interface PaletteResolutionClientInterface {
  'dispose': () => void;
  'request': (message: WorkerMessageEntity.Type) => Promise<WorkerReplyEntity.Type | undefined>;
}
