import type { PaletteSnapshotEntity } from '../../entities/PaletteSnapshotEntity.ts';
import type { PaletteSessionInputEntity } from '../entities/PaletteSessionInputEntity.ts';

/** Receives the resolution outcomes the runtime settles; only the current revision's outcome arrives. */
export interface PaletteSessionOutcomeInterface {
  'combineFailed': (message: string) => void;
  'failed': (revision: number, correlationId: string, message: string) => void;
  'published': (
    revision: number,
    correlationId: string,
    input: PaletteSessionInputEntity.Type,
    snapshot: PaletteSnapshotEntity.Type
  ) => void;
}
