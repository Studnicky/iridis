import type { PaletteSnapshotEntity } from '../../entities/PaletteSnapshotEntity.ts';

/** The slot that carries the server-resolved palette snapshot into the client render. */
export interface PaletteSessionSnapshotHandoffInterface {
  'read': () => PaletteSnapshotEntity.Type | null;
  'write': (snapshot: PaletteSnapshotEntity.Type | null) => void;
}
