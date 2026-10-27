import type { PaletteSessionImageEntity } from './entities/PaletteSessionImageEntity.ts';
import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';
import type { PaletteSessionReadModelEntity } from './entities/PaletteSessionReadModelEntity.ts';
import type { PaletteResolutionClientProviderInterface } from './interfaces/PaletteResolutionClientProviderInterface.ts';

import { ExtractionSettingsEntity } from '../entities/ExtractionSettingsEntity.ts';
import { PaletteInteractionCommandEntity } from './entities/PaletteInteractionCommandEntity.ts';
import { PaletteInteractionEnvelopeEntity } from './entities/PaletteInteractionEnvelopeEntity.ts';
import { PaletteSessionEvent } from './fsm/PaletteSessionEvent.ts';
import { PaletteSessionEffectHandlers } from './PaletteSessionEffectHandlers.ts';
import { PaletteSessionImage } from './PaletteSessionImage.ts';
import { PaletteSessionInput } from './PaletteSessionInput.ts';
import { PaletteSessionLaneFailures } from './PaletteSessionLaneFailures.ts';
import { PaletteSessionPublisher } from './PaletteSessionPublisher.ts';
import { PaletteSessionRuntime } from './PaletteSessionRuntime.ts';

/** One session's single source of truth: admits intents, reduces the input, resolves once per settled revision, and publishes the read model. */
export class PaletteSessionStore {
  #combineEpoch = 0;
  #live = true;
  readonly #failures: PaletteSessionLaneFailures;
  readonly #handlers: PaletteSessionEffectHandlers;
  #image: PaletteSessionImageEntity.Type;
  #input: PaletteSessionInputEntity.Type;
  readonly #publisher: PaletteSessionPublisher;
  #revision = 0;
  readonly #runtime: PaletteSessionRuntime;

  public constructor(provider: PaletteResolutionClientProviderInterface) {
    this.#input = PaletteSessionInput.initial();
    this.#image = PaletteSessionImage.initial();
    this.#publisher = new PaletteSessionPublisher(this.#input, this.#image);
    this.#runtime = new PaletteSessionRuntime(this.#input);
    this.#failures = new PaletteSessionLaneFailures((command) => { this.#issue(command); });
    this.#handlers = new PaletteSessionEffectHandlers(this.#runtime, provider, this.#publisher, this.#failures);
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

  /** Hands an uploaded image's pixels to the engine worker; load them before adding the entry that extracts them. */
  public async loadPixels(imageId: string, width: number, height: number, pixels: ArrayBuffer): Promise<void> {
    this.#assertLive();
    await this.#handlers.loadPixels(imageId, width, height, pixels);
  }

  /** Applies a stamped envelope; only the envelope carrying the next revision is accepted. */
  public publishIntent(envelope: PaletteInteractionEnvelopeEntity.Type): void {
    this.#assertLive();
    const intent = PaletteInteractionEnvelopeEntity.intake(envelope);
    if (intent.revision !== this.#revision + 1) {
      throw new RangeError(`Palette intent targets revision ${String(intent.revision)}, expected ${String(this.#revision + 1)}`);
    }
    const next = PaletteSessionInput.reduce(this.#input, intent.command);
    const previousImage = this.#image;
    const image = PaletteSessionImage.reduce(previousImage, intent.command, this.#input);
    const resolves = PaletteSessionInput.fingerprint(next) !== PaletteSessionInput.fingerprint(this.#input);
    this.#revision = intent.revision;
    this.#input = next;
    this.#image = image;
    if (resolves) {
      this.#publisher.resolving(intent.revision, intent.correlationId, next, image);
      this.#runtime.send(PaletteSessionEvent.published(intent.revision, intent.correlationId, next));
    } else {
      this.#publisher.revised(intent.revision, intent.correlationId, next, image);
    }
    this.#dispatchImage(previousImage, intent.command);
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

  async #combine(): Promise<void> {
    this.#combineEpoch += 1;
    const epoch = this.#combineEpoch;
    const hexes = PaletteSessionImage.combineHexes(this.#image);
    if (hexes.length === 0) {
      this.#issue({ 'interaction': 'palette.image.combine.applied', 'payload': { 'result': { 'candidates': [], 'extracted': [], 'histogram': [] } } });
    } else {
      try {
        const result = await this.#handlers.combine(this.#input, hexes);
        if (result !== undefined && epoch === this.#combineEpoch) {
          this.#issue({ 'interaction': 'palette.image.combine.applied', 'payload': { 'result': result } });
        }
      } catch (error) {
        this.#failures.combineFailed(error instanceof Error ? error.message : String(error));
      }
    }
  }

  #dispatchImage(previous: PaletteSessionImageEntity.Type, command: PaletteInteractionCommandEntity.Type): void {
    const extraction = PaletteSessionImage.extractionFor(this.#image, command);
    if (extraction !== undefined) {
      void this.#extract(extraction.id, ExtractionSettingsEntity.intake(extraction.settings));
    }
    if (command.interaction === 'palette.image.entry.remove') {
      void this.#handlers.release(command.payload.imageId);
    }
    if (PaletteSessionImage.requestsCombine(previous, command)) {
      void this.#combine();
    }
  }

  async #extract(imageId: string, settings: ExtractionSettingsEntity.Type): Promise<void> {
    try {
      const result = await this.#handlers.extract(imageId, settings);
      if (result !== undefined) {
        this.#issue({ 'interaction': 'palette.image.entry.extracted', 'payload': { 'imageId': imageId, 'result': result } });
      }
    } catch (error) {
      this.#failures.extractFailed(imageId, error instanceof Error ? error.message : String(error));
    }
  }

  #issue(command: unknown): void {
    if (this.#live) {
      this.publishIntent(this.createIntent(command));
    }
  }
}
