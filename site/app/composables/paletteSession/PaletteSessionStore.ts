import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';
import type { PaletteSessionReadModelEntity } from './entities/PaletteSessionReadModelEntity.ts';
import type { PaletteResolutionClientProviderInterface } from './interfaces/PaletteResolutionClientProviderInterface.ts';

import { PaletteInteractionCommandEntity } from './entities/PaletteInteractionCommandEntity.ts';
import { PaletteInteractionEnvelopeEntity } from './entities/PaletteInteractionEnvelopeEntity.ts';
import { PaletteSessionEvent } from './fsm/PaletteSessionEvent.ts';
import { PaletteSessionEffectHandlers } from './PaletteSessionEffectHandlers.ts';
import { PaletteSessionInput } from './PaletteSessionInput.ts';
import { PaletteSessionPublisher } from './PaletteSessionPublisher.ts';
import { PaletteSessionRuntime } from './PaletteSessionRuntime.ts';

/** One session's single source of truth: admits intents, reduces the input, resolves once per settled revision, and publishes the read model. */
export class PaletteSessionStore {
  #live = true;
  readonly #handlers: PaletteSessionEffectHandlers;
  #input: PaletteSessionInputEntity.Type;
  readonly #publisher: PaletteSessionPublisher;
  #revision = 0;
  readonly #runtime: PaletteSessionRuntime;

  public constructor(provider: PaletteResolutionClientProviderInterface) {
    this.#input = PaletteSessionInput.initial();
    this.#publisher = new PaletteSessionPublisher(this.#input);
    this.#runtime = new PaletteSessionRuntime(this.#input);
    this.#handlers = new PaletteSessionEffectHandlers(this.#runtime, provider, this.#publisher);
    this.#runtime.register(this.#handlers);
    this.#runtime.send(PaletteSessionEvent.published(0, this.#publisher.current().correlationId, this.#input));
  }

  /** Admits a raw command and stamps it with the next revision; `publishIntent` applies the stamped envelope. */
  public createIntent(command: unknown): PaletteInteractionEnvelopeEntity.Type {
    this.#assertLive();
    const admitted = PaletteInteractionCommandEntity.intake(command);
    const revision = this.#revision + 1;
    const result = PaletteInteractionEnvelopeEntity.intake({
      'command': admitted,
      'correlationId': `intent-${String(revision)}`,
      'revision': revision
    });
    return result;
  }

  public async dispose(): Promise<void> {
    this.#live = false;
    this.#runtime.dispose();
    this.#handlers.dispose();
    await this.#publisher.close();
  }

  /** Applies a stamped envelope; only the envelope carrying the next revision is accepted. */
  public publishIntent(envelope: PaletteInteractionEnvelopeEntity.Type): void {
    this.#assertLive();
    const intent = PaletteInteractionEnvelopeEntity.intake(envelope);
    if (intent.revision !== this.#revision + 1) {
      throw new RangeError(`Palette intent targets revision ${String(intent.revision)}, expected ${String(this.#revision + 1)}`);
    }
    const next = PaletteSessionInput.reduce(this.#input, intent.command);
    const resolves = PaletteSessionInput.fingerprint(next) !== PaletteSessionInput.fingerprint(this.#input);
    this.#revision = intent.revision;
    this.#input = next;
    if (resolves) {
      this.#publisher.resolving(intent.revision, intent.correlationId, next);
      this.#runtime.send(PaletteSessionEvent.published(intent.revision, intent.correlationId, next));
    } else {
      this.#publisher.revised(intent.revision, intent.correlationId, next);
    }
    if (intent.command.interaction === 'palette.image.combine.request') {
      void this.#combine(next, intent.command.payload.hexes);
    }
  }

  public readModel(): PaletteSessionReadModelEntity.Type {
    const result = this.#publisher.current();
    return result;
  }

  public async settled(): Promise<void> {
    await this.#publisher.settled();
  }

  public subscribe(listener: (model: PaletteSessionReadModelEntity.Type) => void): () => void {
    const result = this.#publisher.subscribe(listener);
    return result;
  }

  #assertLive(): void {
    if (!this.#live) {
      throw new Error('The palette session is disposed');
    }
  }

  async #combine(input: PaletteSessionInputEntity.Type, hexes: readonly string[]): Promise<void> {
    try {
      const extracted = await this.#handlers.combine(input, hexes);
      if (extracted !== undefined && extracted.length > 0 && this.#live) {
        this.publishIntent(this.createIntent({ 'interaction': 'palette.seeds.replace', 'payload': { 'hexes': extracted } }));
      }
    } catch (error) {
      this.#publisher.combineFailed(error instanceof Error ? error.message : String(error));
    }
  }
}
