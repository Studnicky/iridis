import type { ImageExtractionResultEntity } from '../../app/composables/entities/ImageExtractionResultEntity.ts';
import type { WorkerMessageEntity } from '../../app/composables/entities/WorkerMessageEntity.ts';
import type { PaletteResolutionClientInterface } from '../../app/composables/paletteSession/interfaces/PaletteResolutionClientInterface.ts';

import { WorkerReplyEntity } from '../../app/composables/entities/WorkerReplyEntity.ts';
import { PaletteResolve } from '../../app/composables/paletteResolve.ts';

/** Records every lane request and settles each one on demand, by request index. */
export class PaletteSessionFakeClient implements PaletteResolutionClientInterface {
  public readonly pixels: ArrayBuffer[] = [];
  public readonly requests: WorkerMessageEntity.Type[] = [];
  readonly #settlers: ((reply: WorkerReplyEntity.Type | undefined) => void)[] = [];

  public answer(index: number): void {
    const message = this.requests[index];
    if (message?.kind !== 'palette') {
      throw new TypeError(`Request ${String(index)} is not a palette request`);
    }
    this.#settlers[index]?.(WorkerReplyEntity.create({ 'id': index, 'kind': 'palette', 'snapshot': PaletteResolve.run(message.request) }));
  }

  public answerCombine(index: number, result: unknown): void {
    this.#settlers[index]?.(WorkerReplyEntity.intake({ 'id': index, 'kind': 'combine', 'result': result }));
  }

  public answerExtract(index: number, result: ImageExtractionResultEntity.Type): void {
    this.#settlers[index]?.(WorkerReplyEntity.create({ 'id': index, 'kind': 'extract', 'result': result }));
  }

  public dispose(): void {
    this.#settlers.length = 0;
  }

  public indexesOf(kind: string): number[] {
    const result: number[] = [];
    for (let index = 0; index < this.requests.length; index += 1) {
      if (this.requests[index]?.kind === kind) {
        result.push(index);
      }
    }
    return result;
  }

  public paletteRequests(): WorkerMessageEntity.Type[] {
    const result = this.requests.filter((message) => {
      const isPalette = message.kind === 'palette';
      return isPalette;
    });
    return result;
  }

  public request(message: WorkerMessageEntity.Type, pixels?: ArrayBuffer): Promise<WorkerReplyEntity.Type | undefined> {
    this.requests.push(message);
    if (pixels !== undefined) {
      this.pixels.push(pixels);
    }
    const laneless = message.kind === 'pixels' || message.kind === 'release';
    const result = new Promise<WorkerReplyEntity.Type | undefined>((resolve) => {
      this.#settlers.push(resolve);
      if (laneless) {
        resolve(undefined);
      }
    });
    return result;
  }

  public supersede(index: number): void {
    this.#settlers[index]?.(undefined);
  }
}
