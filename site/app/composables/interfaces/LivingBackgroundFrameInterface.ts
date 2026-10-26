import type { PaletteEntity } from '@studnicky/iridis-algebra';

import type { RoleHexMapType } from '../types/roleHexMapType.ts';

/** One painted frame of the drift: the interpolated palette, its decorative hex tokens, and the animation clock. */
export interface LivingBackgroundFrameInterface {
  readonly 'animationMs': number;
  readonly 'frame': PaletteEntity.Type;
  readonly 'tokens': RoleHexMapType;
}
