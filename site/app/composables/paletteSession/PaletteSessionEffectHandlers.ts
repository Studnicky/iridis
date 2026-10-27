import type { ExtractionSettingsEntity } from '../entities/ExtractionSettingsEntity.ts';
import type { ImageCombineResultEntity } from '../entities/ImageCombineResultEntity.ts';
import type { ImageExtractionResultEntity } from '../entities/ImageExtractionResultEntity.ts';
import type { PaletteSnapshotEntity } from '../entities/PaletteSnapshotEntity.ts';
import type { WorkerEnvelopeEntity } from '../entities/WorkerEnvelopeEntity.ts';
import type { WorkerReplyEntity } from '../entities/WorkerReplyEntity.ts';
import type { WorkerHandlersInterface } from '../interfaces/WorkerHandlersInterface.ts';
import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';
import type { PaletteResolutionClientInterface } from './interfaces/PaletteResolutionClientInterface.ts';
import type { PaletteResolutionClientProviderInterface } from './interfaces/PaletteResolutionClientProviderInterface.ts';
import type { PaletteSessionEffectHandlersInterface } from './interfaces/PaletteSessionEffectHandlersInterface.ts';
import type { PaletteSessionLaneFailureInterface } from './interfaces/PaletteSessionLaneFailureInterface.ts';
import type { PaletteSessionOutcomeInterface } from './interfaces/PaletteSessionOutcomeInterface.ts';
import type { PaletteSessionRuntime } from './PaletteSessionRuntime.ts';

import { WorkerMessageEntity } from '../entities/WorkerMessageEntity.ts';
import { PaletteSessionEvent } from './fsm/PaletteSessionEvent.ts';
import { PaletteSessionRequest } from './PaletteSessionRequest.ts';

/** Attributes a lane failure to the lane that just went idle. */
class LaneFailureHandlers implements WorkerHandlersInterface {
  #lastIdle = '';
  readonly #onFailure: (lane: string, message: string) => void;

  public constructor(onFailure: (lane: string, message: string) => void) {
    this.#onFailure = onFailure;
  }

  public accept(_reply: WorkerReplyEntity.Type, _envelope: WorkerEnvelopeEntity.Type): void {
    this.#lastIdle = '';
  }

  public busy(_message: WorkerMessageEntity.Type): void {
    this.#lastIdle = '';
  }

  public idle(message: WorkerMessageEntity.Type): void {
    this.#lastIdle = message.kind === 'extract' ? `extract:${message.imageId}` : message.kind;
  }

  public reject(message: string): void {
    this.#onFailure(this.#lastIdle, message);
  }
}

/** Runs palette FSM effects: one `palette` lane request per settled revision, one microtask boundary per tick. */
export class PaletteSessionEffectHandlers implements PaletteSessionEffectHandlersInterface {
  readonly #client: PaletteResolutionClientInterface;
  readonly #laneFailure: PaletteSessionLaneFailureInterface;
  readonly #outcome: PaletteSessionOutcomeInterface;
  readonly #runtime: PaletteSessionRuntime;
  #submitted = 0;

  public constructor(
    runtime: PaletteSessionRuntime,
    provider: PaletteResolutionClientProviderInterface,
    outcome: PaletteSessionOutcomeInterface,
    laneFailure: PaletteSessionLaneFailureInterface
  ) {
    this.#laneFailure = laneFailure;
    this.#outcome = outcome;
    this.#runtime = runtime;
    this.#client = provider.open(new LaneFailureHandlers((lane, message) => { this.#laneFailed(lane, message); }));
  }

  public async combine(input: PaletteSessionInputEntity.Type, hexes: readonly string[]): Promise<ImageCombineResultEntity.Type | undefined> {
    const reply = await this.#client.request(PaletteSessionRequest.combine(input, hexes));
    const result = reply?.kind === 'combine' ? reply.result : undefined;
    return result;
  }

  public dispose(): void {
    this.#client.dispose();
  }

  public async extract(imageId: string, settings: ExtractionSettingsEntity.Type): Promise<ImageExtractionResultEntity.Type | undefined> {
    const reply = await this.#client.request(WorkerMessageEntity.create({ 'imageId': imageId, 'kind': 'extract', 'settings': settings }));
    const result = reply?.kind === 'extract' ? reply.result : undefined;
    return result;
  }

  public fail(revision: number, correlationId: string, message: string): void {
    this.#outcome.failed(revision, correlationId, message);
  }

  public publish(
    revision: number,
    correlationId: string,
    input: PaletteSessionInputEntity.Type,
    snapshot: PaletteSnapshotEntity.Type
  ): void {
    this.#outcome.published(revision, correlationId, input, snapshot);
  }

  /** Hands an image's pixels to the engine worker; the extract lane reads them by image id. */
  public async loadPixels(imageId: string, width: number, height: number, pixels: ArrayBuffer): Promise<void> {
    await this.#client.request(WorkerMessageEntity.create({ 'height': height, 'imageId': imageId, 'kind': 'pixels', 'width': width }), pixels);
  }

  public async release(imageId: string): Promise<void> {
    await this.#client.request(WorkerMessageEntity.create({ 'imageId': imageId, 'kind': 'release' }));
  }

  public settle(): void {
    queueMicrotask(() => { this.#runtime.send(PaletteSessionEvent.settled()); });
  }

  public submit(revision: number, _correlationId: string, input: PaletteSessionInputEntity.Type): void {
    this.#submitted = revision;
    void this.#resolve(revision, input);
  }

  #laneFailed(lane: string, message: string): void {
    if (lane === 'combine') {
      this.#laneFailure.combineFailed(message);
    } else if (lane.startsWith('extract:')) {
      this.#laneFailure.extractFailed(lane.slice('extract:'.length), message);
    } else {
      this.#runtime.send(PaletteSessionEvent.failed(this.#submitted, message));
    }
  }

  async #resolve(revision: number, input: PaletteSessionInputEntity.Type): Promise<void> {
    try {
      const reply = await this.#client.request(PaletteSessionRequest.palette(input));
      if (reply?.kind === 'palette') {
        const snapshot = reply.snapshot;
        if (snapshot === undefined) {
          this.#runtime.send(PaletteSessionEvent.failed(revision, 'Palette resolve reply carried no snapshot'));
        } else {
          this.#runtime.send(PaletteSessionEvent.succeeded(revision, snapshot));
        }
      }
    } catch (error) {
      this.#runtime.send(PaletteSessionEvent.failed(revision, error instanceof Error ? error.message : String(error)));
    }
  }
}
