import type { ALIAS_COLOR_NAMES } from '../aliasColorNames.ts';

export namespace AliasColorType {
  export type Type = (typeof ALIAS_COLOR_NAMES)[number];
}
