import type { PaletteSessionReadModelEntity } from './entities/PaletteSessionReadModelEntity.ts';

import { PaletteSessionStatusEntity } from './entities/PaletteSessionStatusEntity.ts';

/** Merges the palette, combine, and extract lane states of a read model into one status. */
export class PaletteSessionStatusView {
  public static from(model: PaletteSessionReadModelEntity.Type): PaletteSessionStatusEntity.Type {
    const resolving = model.status === 'resolving';
    const combining = model.image.combine.status === 'combining';
    const extracting = model.image.entries.some((entry) => {
      const active = entry.status === 'extracting';
      return active;
    });
    const result = PaletteSessionStatusEntity.create({
      'error': PaletteSessionStatusView.firstError(model),
      'resolving': resolving,
      'running': resolving || combining || extracting
    });
    return result;
  }

  private static firstError(model: PaletteSessionReadModelEntity.Type): string | null {
    const failedEntry = model.image.entries.find((entry) => {
      const failed = entry.error !== undefined;
      return failed;
    });
    const result = model.error ?? model.image.combine.error ?? failedEntry?.error ?? null;
    return result;
  }
}
