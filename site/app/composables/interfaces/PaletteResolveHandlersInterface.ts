import type { PaletteResolveRequestInterfaceTypeEntity } from '../entities/PaletteResolveRequestInterfaceTypeEntity.ts';
import type { PaletteSnapshotInterfaceTypeEntity } from '../entities/PaletteSnapshotInterfaceTypeEntity.ts';

/** Receives the outcome of the newest palette request and the busy and idle transitions of the resolve host. */
export interface PaletteResolveHandlersInterface {
  accept(snapshot: PaletteSnapshotInterfaceTypeEntity.Type, request: PaletteResolveRequestInterfaceTypeEntity.Type): void;
  busy(): void;
  idle(): void;
  reject(message: string): void;
}
