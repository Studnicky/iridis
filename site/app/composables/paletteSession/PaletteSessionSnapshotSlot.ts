import type { PaletteSnapshotEntity } from '../entities/PaletteSnapshotEntity.ts';
import type { PaletteSessionSnapshotHandoffInterface } from './interfaces/PaletteSessionSnapshotHandoffInterface.ts';

/** The handoff over a Nuxt state slot, which serialises into the SSR payload. */
export class PaletteSessionSnapshotSlot implements PaletteSessionSnapshotHandoffInterface {
  readonly #load: () => PaletteSnapshotEntity.Type | null;
  readonly #store: (snapshot: PaletteSnapshotEntity.Type | null) => void;

  public constructor(
    load: () => PaletteSnapshotEntity.Type | null,
    store: (snapshot: PaletteSnapshotEntity.Type | null) => void
  ) {
    this.#load = load;
    this.#store = store;
  }

  public read(): PaletteSnapshotEntity.Type | null {
    const result = this.#load();
    return result;
  }

  public write(snapshot: PaletteSnapshotEntity.Type | null): void {
    this.#store(snapshot);
  }
}
