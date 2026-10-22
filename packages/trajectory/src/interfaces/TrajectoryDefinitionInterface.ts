import type { PaletteEntity } from '@studnicky/iridis-algebra';
import type { CurveOptionsInterface } from '@studnicky/iridis-anima';

/** Palette stops and their optional injected animation strategies. */
export interface TrajectoryDefinitionInterface {
  readonly 'options'?: CurveOptionsInterface;
  readonly 'stops': PaletteEntity.Type[];
}
