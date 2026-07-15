/**
 * Active theme's role/palette DATA layout — read by RolesTable.vue,
 * ResolvedRoles.vue, PairingPreview.vue, and PaletteCarousel.vue to pick their
 * container structure (grid/list/pixel/table). The rows each of those
 * components renders come from the exact same `useIridis()`/
 * `usePairingPreview()` sort/derive logic regardless of this value — only the
 * DOM structure the rows land in changes.
 */
import { computed, type ComputedRef } from 'vue';
import { useThemePreset } from './useThemePreset.ts';

import type { ThemeDefinitionInterfaceType } from '~/theme/ThemeDefinitionInterfaceType.ts';

export function useDataLayout(): { 'dataLayout': ComputedRef<ThemeDefinitionInterfaceType['dataLayout']> } {
  const { activeThemeKey, THEMES } = useThemePreset();
  const dataLayout = computed(() => (THEMES[activeThemeKey.value] ?? Object.values(THEMES)[0]!).dataLayout);
  return { 'dataLayout': dataLayout };
}
