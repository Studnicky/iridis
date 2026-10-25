import type { WorkerReplyEntity } from '../entities/WorkerReplyEntity.ts';

/** The worker global the engine host listens on and replies through. */
export interface EngineWorkerScopeInterface {
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  postMessage(reply: WorkerReplyEntity.Type): void;
}
