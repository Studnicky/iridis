import { PaletteInterfaceTypeEntity } from '@studnicky/iridis-algebra';

import type { RoleViewType } from './types/index.ts';

import { DECORATIVE_ALIASES } from './decorativeAliases.ts';

const DECORATIVE_ROLE_NAMES: readonly string[] = [...new Set(Object.values(DECORATIVE_ALIASES))];

/** Builds a Palette restricted to the decorative role names, from the live engine roleViews. */
class BuildDecorativePaletteOperation {
  static run(views: RoleViewType[]): PaletteInterfaceTypeEntity.Type {
    const palette: PaletteInterfaceTypeEntity.Type = {};
    const viewsByName = new Map(views.map((view) => {return [view.name, view];}));
    for (let index = 0; index < DECORATIVE_ROLE_NAMES.length; index += 1) {
      const name = DECORATIVE_ROLE_NAMES[index];
      if (name === undefined) {
        throw new RangeError(`Decorative role name list is missing entry ${index}`);
      }
      const view = viewsByName.get(name);
      if (view === undefined) { continue; }
      Object.defineProperty(palette, name, { 'configurable': true, 'enumerable': true, 'value': { 'c': view.c, 'h': view.h, 'l': view.l }, 'writable': true });
    }
    const result = PaletteInterfaceTypeEntity.create(palette);
    return result;
  }
}

export const buildDecorativePalette = BuildDecorativePaletteOperation.run;
