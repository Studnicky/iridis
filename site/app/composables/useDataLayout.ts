/**
 * Selects the active theme's presentation layout for components that render
 * committed PaletteSession read models. Palette resolution and presentation
 * publication remain owned by the PaletteSession and PresentationCommitter;
 * this composable selects only the container strategy.
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
