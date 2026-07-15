import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { RoleViewType } from './types/index.ts';

import { DECORATIVE_ALIASES } from './decorativeAliases.ts';

const DECORATIVE_ROLE_NAMES: readonly string[] = [...new Set(Object.values(DECORATIVE_ALIASES))];

/** Builds a Palette restricted to the decorative role names, from the live engine roleViews. */
export function buildDecorativePalette(views: RoleViewType[]): PaletteInterfaceType {
  const palette: PaletteInterfaceType = {};
  for (const name of DECORATIVE_ROLE_NAMES) {
    const view = views.find((v) => {return v.name === name;});
    if (view === undefined) { continue; }
    palette[name] = { 'c': view.c, 'h': view.h, 'l': view.l };
  }
  return palette;
}
