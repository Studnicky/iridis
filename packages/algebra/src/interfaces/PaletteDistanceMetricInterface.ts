import type { PaletteInterfaceTypeEntity } from '../entities/PaletteInterfaceTypeEntity.ts';

/** A perceptual distance operation selected by callers of `nearest`. */
export interface PaletteDistanceMetricInterface {
  measure(a: PaletteInterfaceTypeEntity.Type, b: PaletteInterfaceTypeEntity.Type): number;
}
