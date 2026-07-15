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

import { onNuxtReady } from '#imports';

import type { ThemeDefinitionInterfaceType } from '../theme/ThemeDefinitionInterfaceType.ts';

import { THEMES } from '../theme/presets/index.ts';

const STORAGE_KEY = 'iridis-theme-preset';
const DEFAULT_THEME_KEY = 'futuristic';

/** Persisted, SSR-safe active theme key. Module-level so every consumer shares one instance. */
const activeThemeKey = ref<string>(DEFAULT_THEME_KEY);

/** Reactive ambient config AmbientBackground.vue reads — kept as its own ref so the component only re-renders on ambient changes, not on unrelated theme fields. */
const activeAmbient = ref<ThemeDefinitionInterfaceType['ambient']>(THEMES[DEFAULT_THEME_KEY]!.ambient);

/** DOM writer — SSR-guarded. Sets the theme data attribute (its own adapter stylesheet cascades in font/radius/border-style) and updates the reactive ambient config. */
class ThemePreset {
  /**
   * `<html>` sits outside the Vue-managed tree Nuxt hydrates (that starts at
   * `#__nuxt`), so writing its data attribute is invisible to hydration
   * diffing — safe to do as early as possible (even before the Vue app
   * mounts) so the theme's CSS cascades in without a flash of the wrong
   * theme. Split out from `apply()` so the DOM-attribute write and the
   * Vue-reactive state update (`activeAmbient`, read by templates and
   * therefore hydration-sensitive) can happen on different schedules.
   */
  static writeDomAttribute(key: string): void {
    if (typeof document === 'undefined') { return; }
    const theme = THEMES[key] ?? THEMES[DEFAULT_THEME_KEY]!;
    document.documentElement.dataset.iridisTheme = theme.key;
  }

  static apply(key: string): void {
    const theme = THEMES[key] ?? THEMES[DEFAULT_THEME_KEY]!;
    activeAmbient.value = theme.ambient;
    ThemePreset.writeDomAttribute(key);
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
    watch(activeThemeKey, (key) => {
      ThemePreset.apply(key);
      if (typeof window !== 'undefined') { window.localStorage.setItem(STORAGE_KEY, key); }
    });
    /**
     * The site is fully static-prerendered — the prerendered HTML always
     * bakes in DEFAULT_THEME_KEY, since there is no persisted preference at
     * build time. Reading localStorage synchronously here would make the
     * client's very first render (the one hydration diffs against) disagree
     * with that baked-in default, producing hydration mismatches everywhere
     * a theme value is read (ambient style, dataLayout branches, the theme
     * picker's own label, LogoBackground's dispatch). Deferring the read to
     * onNuxtReady means the client's first render matches the server
     * byte-for-byte — the persisted theme then cascades in as one ordinary
     * post-hydration reactive update, which Vue patches normally instead of
     * skipping (hydration-time attribute/text patches are check-only and
     * never actually applied in production).
     */
    const persisted = ThemePreset.readPersistedKey();
    ThemePreset.writeDomAttribute(persisted);
    onNuxtReady(() => {
      if (persisted !== activeThemeKey.value) { activeThemeKey.value = persisted; }
    });
  }
  return {
    'activeAmbient':    activeAmbient,
    'activeThemeKey':   activeThemeKey,
    'applyThemePreset': ThemePreset.apply,
    'THEMES':           THEMES
  };
}
