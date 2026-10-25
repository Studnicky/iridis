import type { PaletteEntity } from '../entities/PaletteEntity.ts';

/** A perceptual distance operation selected by callers of `nearest`. */
export interface PaletteDistanceMetricInterface {
  measure(a: PaletteEntity.Type, b: PaletteEntity.Type): number;
}
