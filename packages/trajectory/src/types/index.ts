import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';
import type { CurveOptionsInterfaceType } from '@studnicky/iridis-anima';

export type TrajectoryDefinitionInterfaceType = {
  'opts': CurveOptionsInterfaceType | undefined;
  'stops': PaletteInterfaceType[];
};
