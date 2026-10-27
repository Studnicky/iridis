import type { PaletteSnapshotEntity } from '../../entities/PaletteSnapshotEntity.ts';
import type { PaletteSessionInputEntity } from '../entities/PaletteSessionInputEntity.ts';

/** Capabilities the palette FSM effects invoke. */
export interface PaletteSessionEffectHandlersInterface {
  'fail': (revision: number, correlationId: string, message: string) => void;
  'publish': (
    revision: number,
    correlationId: string,
    input: PaletteSessionInputEntity.Type,
    snapshot: PaletteSnapshotEntity.Type
  ) => void;
  'settle': () => void;
  'submit': (revision: number, correlationId: string, input: PaletteSessionInputEntity.Type) => void;
}
