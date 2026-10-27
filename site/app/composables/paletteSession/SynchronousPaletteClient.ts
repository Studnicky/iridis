import type { WorkerMessageEntity } from '../entities/WorkerMessageEntity.ts';
import type { PaletteResolutionClientInterface } from './interfaces/PaletteResolutionClientInterface.ts';

import { WorkerReplyEntity } from '../entities/WorkerReplyEntity.ts';
import { PaletteResolve } from '../paletteResolve.ts';

/** Resolves palette requests in-process through the engine path the worker runs; used where no worker exists. */
export class SynchronousPaletteClient implements PaletteResolutionClientInterface {
  public dispose(): void {
    // Holds no resources.
  }

  public request(message: WorkerMessageEntity.Type): Promise<WorkerReplyEntity.Type | undefined> {
    const result = new Promise<WorkerReplyEntity.Type | undefined>((resolve, reject) => {
      if (message.kind === 'palette') {
        resolve(WorkerReplyEntity.create({ 'id': 0, 'kind': 'palette', 'snapshot': PaletteResolve.run(message.request) }));
      } else {
        reject(new RangeError(`The synchronous palette client resolves palette requests, not ${message.kind}`));
      }
    });
    return result;
  }
}
