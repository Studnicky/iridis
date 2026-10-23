import type { PaletteEntity } from '@studnicky/iridis-algebra';

import type { RoleViewType } from './types/index.ts';

import { buildDecorativePalette } from './buildDecorativePalette.ts';

/**
 * Resolves the palette to drift from for the current tick. If `from` is
 * already populated, it's returned unchanged. Otherwise this re-attempts
 * `buildDecorativePalette(views)` — the engine's initial palette resolves
 * asynchronously (image extraction in useIridis.ts), so `views` may still be
 * empty on the first several ticks after `useLivingBackground()` is invoked;
 * retrying here (rather than giving up after one empty read) is what lets the
 * loop pick up the palette once it becomes available.
 */
class ResolveFromPaletteOperation {
  static run(from: PaletteEntity.Type, views: RoleViewType[]): PaletteEntity.Type {
    if (Object.keys(from).length > 0) {
      const result = from;
      return result;
    }
    const result = buildDecorativePalette(views);
    return result;
  }
}

export const resolveFromPalette = ResolveFromPaletteOperation.run;
