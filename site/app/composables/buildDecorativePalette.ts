import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { RoleViewType } from './types/index.ts';

import { DECORATIVE_ALIASES } from './decorativeAliases.ts';

const DECORATIVE_ROLE_NAMES: readonly string[] = [...new Set(Object.values(DECORATIVE_ALIASES))];

/** Builds a Palette restricted to the decorative role names, from the live engine roleViews. */
class BuildDecorativePaletteOperation {
  static run(views: RoleViewType[]): PaletteInterfaceType {
    const palette: PaletteInterfaceType = {};
    const viewsByName = new Map(views.map((view) => {return [view.name, view];}));
    for (const name of DECORATIVE_ROLE_NAMES) {
      const view = viewsByName.get(name);
      if (view === undefined) { continue; }
      palette[name] = { 'c': view.c, 'h': view.h, 'l': view.l };
    }
    return palette;
  }
}

export const buildDecorativePalette = BuildDecorativePaletteOperation.run;
