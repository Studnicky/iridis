import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { RoleHexMapType } from './types/index.ts';

import { oklchToHex } from '../utils/oklchToHex.ts';
import { DECORATIVE_ALIASES } from './decorativeAliases.ts';

/** Builds the partial `--ui-color-{alias}-500` token set for one animation frame's palette. */
export function tokensForFrame(frame: PaletteInterfaceType): RoleHexMapType {
  const tokens: RoleHexMapType = {};
  for (const [alias, roleName] of Object.entries(DECORATIVE_ALIASES)) {
    const role = frame[roleName];
    if (role === undefined) { continue; }
    tokens[`--ui-color-${alias}-500`] = oklchToHex(role.l, role.c, role.h);
  }
  return tokens;
}
