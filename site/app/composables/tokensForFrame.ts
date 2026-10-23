import type { PaletteEntity } from '@studnicky/iridis-algebra';

import type { RoleHexMapType } from './types/index.ts';

import { oklchToHex } from '../utils/oklchToHex.ts';
import { DECORATIVE_ALIASES } from './decorativeAliases.ts';

/** Builds the partial `--ui-color-{alias}-500` token set for one animation frame's palette. */
class TokensForFrameOperation {
  static run(frame: PaletteEntity.Type): RoleHexMapType {
    const tokens: RoleHexMapType = {};
    const entries = Object.entries(DECORATIVE_ALIASES);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        throw new RangeError(`Decorative alias entry list is missing entry ${index}`);
      }
      const [alias, roleName] = entry;
      const role = frame[roleName];
      if (role === undefined) { continue; }
      Object.defineProperty(tokens, `--ui-color-${alias}-500`, { 'configurable': true, 'enumerable': true, 'value': oklchToHex(role.l, role.c, role.h), 'writable': true });
    }
    const result = tokens;
    return result;
  }
}

export const tokensForFrame = TokensForFrameOperation.run;
