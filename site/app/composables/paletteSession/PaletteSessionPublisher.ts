import type { ContrastFeasibilityReportEntity } from '@studnicky/iridis-contrast';

import { EventBus } from '@studnicky/event-bus/browser';
import { LOG_STATUS, LogBody } from '@studnicky/logger/browser';

import type { PaletteSnapshotEntity } from '../entities/PaletteSnapshotEntity.ts';
import type { PaletteSessionImageEntity } from './entities/PaletteSessionImageEntity.ts';
import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';
import type { PaletteSessionReadModelEntity } from './entities/PaletteSessionReadModelEntity.ts';
import type { PaletteSessionTopicsEntity } from './entities/PaletteSessionTopicsEntity.ts';
import type { PaletteSessionOutcomeInterface } from './interfaces/PaletteSessionOutcomeInterface.ts';

import { logger } from '../logger.ts';
import { PaletteSessionReadModel } from './PaletteSessionReadModel.ts';

/** Holds the current read model, publishes every change to subscribers, and releases waiters once no resolution is outstanding. */
export class PaletteSessionPublisher implements PaletteSessionOutcomeInterface {
  readonly #bus = EventBus.create<PaletteSessionTopicsEntity.Type>();
  #chain: Promise<void> = Promise.resolve();
  #model: PaletteSessionReadModelEntity.Type;
  readonly #waiters: (() => void)[] = [];

  public constructor(input: PaletteSessionInputEntity.Type, image: PaletteSessionImageEntity.Type) {
    this.#model = PaletteSessionReadModel.initial(input, image);
  }

  public async close(): Promise<void> {
    this.#release();
    await this.#chain;
    await this.#bus.close();
  }

  public current(): PaletteSessionReadModelEntity.Type {
    return this.#model;
  }

  public failed(_revision: number, _correlationId: string, message: string): void {
    this.#publish(PaletteSessionReadModel.failed(this.#model, message));
    this.#release();
  }

  public feasibilityChecking(): void {
    this.#publish(PaletteSessionReadModel.feasibilityChecking(this.#model));
  }

  public feasibilityFailed(message: string): void {
    this.#publish(PaletteSessionReadModel.feasibilityFailed(this.#model, message));
  }

  public feasibilityReported(report: ContrastFeasibilityReportEntity.Type): void {
    this.#publish(PaletteSessionReadModel.feasibilityReported(this.#model, report));
  }

  public published(
    revision: number,
    correlationId: string,
    input: PaletteSessionInputEntity.Type,
    snapshot: PaletteSnapshotEntity.Type
  ): void {
    this.#publish(PaletteSessionReadModel.resolved(this.#model, revision, correlationId, input, snapshot));
    this.#release();
  }

  public revised(revision: number, correlationId: string, input: PaletteSessionInputEntity.Type, image: PaletteSessionImageEntity.Type): void {
    this.#publish(PaletteSessionReadModel.revised(this.#model, revision, correlationId, input, image));
  }

  public resolving(revision: number, correlationId: string, input: PaletteSessionInputEntity.Type, image: PaletteSessionImageEntity.Type): void {
    this.#publish(PaletteSessionReadModel.resolving(this.#model, revision, correlationId, input, image));
  }

  /** Resolves once no resolution is outstanding and every subscriber has received the latest read model. */
  public async settled(): Promise<void> {
    if (this.#model.status === 'resolving') {
      await new Promise<void>((resolve) => { this.#waiters.push(resolve); });
    }
    await this.#chain;
    await this.#bus.drain();
  }

  public subscribe(listener: (model: PaletteSessionReadModelEntity.Type) => void): () => void {
    const result = this.#bus.subscribe('read-model', (model) => { listener(model); });
    return result;
  }

  #publish(model: PaletteSessionReadModelEntity.Type): void {
    this.#model = model;
    this.#chain = this.#chain.then(async () => { await this.#bus.publish('read-model', model); }).catch(() => {
      logger.error(
        LogBody.create({
          'component': 'PaletteSessionPublisher',
          'context': {},
          'message': 'Read model publication failed',
          'operation': 'publish',
          'status': LOG_STATUS.FAILED
        })
      );
    });
  }

  #release(): void {
    const waiting = this.#waiters.splice(0);
    for (let index = 0; index < waiting.length; index += 1) {
      waiting[index]?.();
    }
  }
}
