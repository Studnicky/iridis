/**
 * Theme preset state for the current Nuxt app. The selected key lives in the
 * presentation-controls store; each theme's adapter stylesheet cascades in via
 * `[data-iridis-theme="<key>"]`, and the ambient background reads the active
 * theme's config from the THEMES registry.
 */

import * as VueModule from 'vue';

import { onNuxtReady } from '#imports';

import type { ThemeDefinitionInterface } from '../theme/ThemeDefinitionInterface.ts';
import type { PresentationControlsComposition } from './presentationControls/PresentationControlsComposition.ts';

import { THEMES } from '../theme/presets/index.ts';
import { THEME_PRESET_CONSTANTS } from './constants/ThemePresetConstants.ts';
import { PresentationPreferencesBridge } from './presentationControls/PresentationPreferencesBridge.ts';
import { usePresentationControls } from './usePresentationControls.ts';

const initialTheme = THEMES.get(THEME_PRESET_CONSTANTS.DEFAULT_THEME_KEY);
if (initialTheme === undefined) {
  throw new TypeError('Theme registry must contain the default theme');
}
const defaultTheme: ThemeDefinitionInterface = initialTheme;

/** Attaches persistence once per app, after the client has mounted. */
class ThemePersistence {
  static readonly #attached = new WeakSet<object>();

  static schedule(composition: PresentationControlsComposition): void {
    if (typeof window !== 'undefined' && !ThemePersistence.#attached.has(composition)) {
      ThemePersistence.#attached.add(composition);
      PresentationPreferencesBridge.applyStoredTheme({ 'element': document.documentElement, 'storage': window.localStorage });
      onNuxtReady(() => {
        void PresentationPreferencesBridge.attachAfterMount(composition.store, {
          'element': document.documentElement,
          'storage': window.localStorage
        });
      });
    }
  }
}

/** Active theme key/ambient state and the THEMES registry for the current app. */
class UseThemePresetOperation {
  static run() {
    const composition = usePresentationControls();
    ThemePersistence.schedule(composition);
    const activeThemeKey = VueModule.computed(() => {
      const key = composition.readModel.value.themeKey;
      return key;
    });
    const selectTheme = (key: string): void => {
      void composition.dispatch({ 'interaction': 'theme.select', 'themeKey': key });
    };
    const activeAmbient = VueModule.computed(() => {
      const theme = THEMES.get(activeThemeKey.value) ?? defaultTheme;
      return theme.ambient;
    });
    return { 'activeAmbient': activeAmbient, 'activeThemeKey': activeThemeKey, 'selectTheme': selectTheme, 'THEMES': THEMES };
  }
}

export const useThemePreset = UseThemePresetOperation.run;
