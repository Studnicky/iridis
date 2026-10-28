import type { ExtractionSettingsEntity } from '../entities/ExtractionSettingsEntity.ts';
import type { PaletteSessionImageSourceOptionsInterface } from './interfaces/PaletteSessionImageSourceOptionsInterface.ts';
import type { PaletteSessionStore } from './PaletteSessionStore.ts';

import { keyedDebounce } from '../../utils/keyedDebounce.ts';
import { PALETTE_SESSION_CONSTANTS } from '../constants/PALETTE_SESSION_CONSTANTS.ts';
import { ImagePixels } from '../imagePixels.ts';

/** One decoded image source awaiting its worker upload. */
interface DecodedSourceInterface {
  'name': string;
  'pixels': ImagePixels;
  'url': string;
}

/** Browser-side image intake: decodes files to pixels, hands them to the engine worker, and records each image as a session entry. */
export class PaletteSessionImageIntake {
  #nextImageId = 0;
  #queue: Promise<void> = Promise.resolve();
  readonly #dispatch: (command: unknown) => Promise<void>;
  readonly #pending = new Map<string, ExtractionSettingsEntity.Type>();
  readonly #reextract = keyedDebounce<string>((imageId) => { void this.#reextractImage(imageId); }, PALETTE_SESSION_CONSTANTS.SETTINGS_DEBOUNCE_MS);
  readonly #report: (message: string | null) => void;
  readonly #store: PaletteSessionStore;

  public constructor(
    store: PaletteSessionStore,
    dispatch: (command: unknown) => Promise<void>,
    report: (message: string | null) => void
  ) {
    this.#dispatch = dispatch;
    this.#report = report;
    this.#store = store;
  }

  private static async decode(sourceUrl: string): Promise<ImagePixels> {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => { resolve(); };
      image.onerror = () => { reject(new Error('Image load failed')); };
      image.src = sourceUrl;
    });
    const long = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = long > PALETTE_SESSION_CONSTANTS.IMAGE_MAXIMUM_DIMENSION ? PALETTE_SESSION_CONSTANTS.IMAGE_MAXIMUM_DIMENSION / long : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { 'willReadFrequently': true });
    if (context === null) {
      throw new Error('no 2D context');
    }
    context.drawImage(image, 0, 0, width, height);
    const result = new ImagePixels(context.getImageData(0, 0, width, height).data.buffer, height, width);
    return result;
  }

  private static async decodeSource(source: File | string, label: string): Promise<DecodedSourceInterface> {
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    try {
      const pixels = await PaletteSessionImageIntake.decode(url);
      const result = { 'name': label, 'pixels': pixels, 'url': url };
      return result;
    } catch (error) {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(url);
      }
      throw error;
    }
  }

  /** Revokes the blob URLs created for decoded sources that never became entries. */
  private static revoke(sources: readonly DecodedSourceInterface[]): void {
    sources.forEach((source) => {
      if (source.url.startsWith('blob:')) {
        URL.revokeObjectURL(source.url);
      }
    });
  }

  /** Queues the sources behind earlier uploads so overlapping drops add every image. */
  public addImages(sources: readonly (File | string)[], options: PaletteSessionImageSourceOptionsInterface): Promise<void> {
    const next = this.#queue.then(() => {
      const added = this.#addBatch(sources, options);
      return added;
    });
    this.#queue = next.catch(() => { /* the failure is reported by the batch */ });
    return next;
  }

  public dispose(): void {
    const ids = [...this.#pending.keys()];
    this.#pending.clear();
    for (let index = 0; index < ids.length; index += 1) {
      this.#reextract.cancel(ids[index] ?? '');
    }
  }

  public async extractSample(url: string, dispatch: (command: unknown) => Promise<void>): Promise<void> {
    await this.addImages([url], { 'dispatch': dispatch, 'names': [PALETTE_SESSION_CONSTANTS.SAMPLE_IMAGE_NAME] });
  }

  /** Drops the image, revokes its blob URL, and cancels any pending re-extraction. */
  public async removeImage(imageId: string): Promise<void> {
    const entry = this.#store.readModel().image.entries.find((candidate) => {
      const found = candidate.id === imageId;
      return found;
    });
    if (entry?.source.startsWith('blob:') === true) {
      URL.revokeObjectURL(entry.source);
    }
    this.#reextract.cancel(imageId);
    this.#pending.delete(imageId);
    await this.#dispatch({ 'interaction': 'palette.image.entry.remove', 'payload': { 'imageId': imageId } });
  }

  /** Records the image's new settings and re-extracts it once they stop changing. */
  public updateImageSetting(imageId: string, settings: ExtractionSettingsEntity.Type): void {
    this.#pending.set(imageId, settings);
    this.#reextract.schedule(imageId);
  }

  async #addBatch(sources: readonly (File | string)[], options: PaletteSessionImageSourceOptionsInterface): Promise<void> {
    if (typeof document !== 'undefined' && sources.length > 0) {
      this.#report(null);
      const decoded: DecodedSourceInterface[] = [];
      try {
        for (let index = 0; index < sources.length; index += 1) {
          decoded.push(await this.#decodeAt(sources, index, options.names));
        }
      } catch (error) {
        PaletteSessionImageIntake.revoke(decoded);
        this.#report(error instanceof Error ? error.message : String(error));
        return;
      }
      for (let index = 0; index < decoded.length; index += 1) {
        await this.#addEntry(decoded, index, options.dispatch);
      }
    }
  }

  async #addEntry(decoded: readonly DecodedSourceInterface[], index: number, dispatch: (command: unknown) => Promise<void>): Promise<void> {
    const source = decoded[index];
    if (source === undefined) {
      throw new RangeError(`Decoded image list is missing entry ${String(index)}`);
    }
    this.#nextImageId += 1;
    const imageId = `img-${String(this.#nextImageId)}-${Date.now().toString(PALETTE_SESSION_CONSTANTS.IMAGE_ID_RADIX)}`;
    await this.#store.loadPixels(imageId, source.pixels.width, source.pixels.height, source.pixels.buffer);
    await dispatch({ 'interaction': 'palette.image.entry.add', 'payload': { 'imageId': imageId, 'name': source.name, 'source': source.url } });
  }

  async #decodeAt(sources: readonly (File | string)[], index: number, names: readonly string[] | undefined): Promise<DecodedSourceInterface> {
    const source = sources[index];
    if (source === undefined) {
      throw new RangeError(`Image source list is missing entry ${String(index)}`);
    }
    const label = typeof source === 'string' ? (names?.[index] ?? PALETTE_SESSION_CONSTANTS.SAMPLE_IMAGE_NAME) : source.name;
    const result = await PaletteSessionImageIntake.decodeSource(source, label);
    return result;
  }

  async #reextractImage(imageId: string): Promise<void> {
    const settings = this.#pending.get(imageId);
    this.#pending.delete(imageId);
    if (settings !== undefined) {
      await this.#dispatch({ 'interaction': 'palette.image.entry.settings.set', 'payload': { 'imageId': imageId, 'settings': settings } });
    }
  }
}
