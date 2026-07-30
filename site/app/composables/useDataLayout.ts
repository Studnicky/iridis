/**
 * Active theme's role/palette DATA layout — read by RolesTable.vue,
 * ResolvedRoles.vue, PairingPreview.vue, and PaletteCarousel.vue to pick their
 * container structure (grid/list/pixel/table). The rows each of those
 * components renders come from the exact same `useIridis()`/
 * `usePairingPreview()` sort/derive logic regardless of this value — only the
 * DOM structure the rows land in changes.
 */
import * as VueModule from 'vue';

import { useThemePreset } from './useThemePreset.ts';

class UseDataLayoutOperation {
  static run() {
    const { activeThemeKey, THEMES } = useThemePreset();
    const dataLayout = VueModule.computed(() => { const result = (THEMES[activeThemeKey.value] ?? Object.values(THEMES)[0]!).dataLayout; return result; });
    return { 'dataLayout': dataLayout };
  }
}

export const useDataLayout = UseDataLayoutOperation.run;
