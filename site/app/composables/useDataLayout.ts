/**
 * Active theme's role/palette DATA layout — read by RolesTable.vue,
 * ResolvedRoles.vue, PairingPreview.vue, and PaletteCarousel.vue to select
 * their container implementation. The rows each component renders come from
 * the exact same `useIridis()`/`usePairingPreview()` sort/derive logic.
 */
import * as VueModule from 'vue';

import { useThemePreset } from './useThemePreset.ts';

class UseDataLayoutOperation {
  static run() {
    const { activeThemeKey, THEMES } = useThemePreset();
    const dataLayout = VueModule.computed(() => {
      const activeTheme = THEMES.get(activeThemeKey.value);
      const fallbackTheme = Array.from(THEMES.values())[0];
      const theme = activeTheme ?? fallbackTheme;
      if (theme === undefined) {
        throw new TypeError('Theme registry must contain at least one theme');
      }
      const result = theme.dataLayout;
      return result;
    });
    return { 'dataLayout': dataLayout };
  }
}

export const useDataLayout = UseDataLayoutOperation.run;
