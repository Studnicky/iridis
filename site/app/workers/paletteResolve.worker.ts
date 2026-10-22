import { PaletteResolveEnvelopeInterfaceTypeEntity } from '../composables/entities/PaletteResolveEnvelopeInterfaceTypeEntity.ts';
import { PaletteResolveReplyInterfaceTypeEntity } from '../composables/entities/PaletteResolveReplyInterfaceTypeEntity.ts';
import { PaletteResolve } from '../composables/paletteResolve.ts';

/** Worker transport: every message is a request envelope, every reply is a snapshot or failure for the same id. */
class PaletteResolveWorkerHost {
  public static reply(data: unknown): PaletteResolveReplyInterfaceTypeEntity.Type {
    const envelope = PaletteResolveEnvelopeInterfaceTypeEntity.intake(data);
    try {
      const result = PaletteResolveReplyInterfaceTypeEntity.create({ 'id': envelope.id, 'snapshot': PaletteResolve.run(envelope.request) });
      return result;
    } catch (error) {
      const result = PaletteResolveReplyInterfaceTypeEntity.create({ 'failure': error instanceof Error ? error.message : String(error), 'id': envelope.id });
      return result;
    }
  }

  /** A dedicated worker only receives messages from its owner, whose events carry an empty origin. */
  public static start(scope: Window): void {
    scope.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (event.origin === '') {
        scope.postMessage(PaletteResolveWorkerHost.reply(event.data));
      }
    });
  }
}

PaletteResolveWorkerHost.start(self);
