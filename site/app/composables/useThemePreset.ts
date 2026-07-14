/**
 * Multi-theme visual preset switcher. Fonts/corner-radius/border-style are
 * pure CSS now — each theme's own adapter stylesheet
 * (site/app/theme/presets/<key>.css) cascades in via
 * `[data-iridis-theme="<key>"]`, so this composable's only DOM write is the
 * data attribute itself. The ambient background stays JS-driven (real
 * per-shape counts/behavior AmbientBackground.vue needs), read from the
 * THEMES registry (site/app/theme/presets/index.ts) — a plain composed map of
 * per-theme adapter modules, not a switch/branch.
 */

import { ref, watch } from 'vue';

import { THEMES } from '../theme/presets/index.ts';

import type { ThemeDefinitionInterfaceType } from '../theme/ThemeDefinitionInterfaceType.ts';

const STORAGE_KEY = 'iridis-theme-preset';
const DEFAULT_THEME_KEY = 'futuristic';

/** Persisted, SSR-safe active theme key. Module-level so every consumer shares one instance. */
const activeThemeKey = ref<string>(DEFAULT_THEME_KEY);

/** Reactive ambient config AmbientBackground.vue reads — kept as its own ref so the component only re-renders on ambient changes, not on unrelated theme fields. */
const activeAmbient = ref<ThemeDefinitionInterfaceType['ambient']>(THEMES[DEFAULT_THEME_KEY]!.ambient);

/** DOM writer — SSR-guarded. Sets the theme data attribute (its own adapter stylesheet cascades in font/radius/border-style) and updates the reactive ambient config. */
class ThemePreset {
  static apply(key: string): void {
    const theme = THEMES[key] ?? THEMES[DEFAULT_THEME_KEY]!;
    activeAmbient.value = theme.ambient;
    if (typeof document === 'undefined') { return; }
    document.documentElement.dataset.iridisTheme = theme.key;
  }

  static readPersistedKey(): string {
    if (typeof window === 'undefined') { return DEFAULT_THEME_KEY; }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null && THEMES[stored] !== undefined) { return stored; }
    return DEFAULT_THEME_KEY;
  }
}

let booted = false;

/** Active theme key/ambient state, the THEMES registry, and the DOM-writing applicator — the single entry point every consumer (theme-switcher UI, AmbientBackground.vue) uses. */
export function useThemePreset(): {
  'activeAmbient': typeof activeAmbient;
  'activeThemeKey': typeof activeThemeKey;
  'applyThemePreset': (key: string) => void;
  'THEMES': Record<string, ThemeDefinitionInterfaceType>;
} {
  if (!booted) {
    booted = true;
    activeThemeKey.value = ThemePreset.readPersistedKey();
    ThemePreset.apply(activeThemeKey.value);
    watch(activeThemeKey, (key) => {
      ThemePreset.apply(key);
      if (typeof window !== 'undefined') { window.localStorage.setItem(STORAGE_KEY, key); }
    });
  }
  return {
    'activeAmbient':    activeAmbient,
    'activeThemeKey':   activeThemeKey,
    'applyThemePreset': ThemePreset.apply,
    'THEMES':           THEMES
  };
}
