import type { PaletteEntity } from '@studnicky/iridis-algebra';

/** Receives one drifted palette sample per fixed simulation step. */
export interface FrameRecorderInterface {
  record(frame: PaletteEntity.Type): void;
}
