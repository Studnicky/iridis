/**
 * Tiny global toggle for the right panel so any component (the panel
 * itself, the home page CTA, the navbar) can call open/close/toggle
 * and observe `panelOpen` without prop-drilling.
 *
 * Defaults to open at every viewport. The drawer is a fixed-position
 * overlay that floats over the right edge; the page content stays
 * readable alongside it. SSR/non-browser environments also default
 * to open so server-rendered markup matches the first client paint.
 */

import { ref } from 'vue';

/** Reactive flag. Open by default at every viewport. */
export const panelOpen = ref(true);

/** Opens the right panel. */
export function openPanel(): void {
  panelOpen.value = true;
}

/** Closes the right panel. */
export function closePanel(): void {
  panelOpen.value = false;
}

/** Toggles the right panel between open and closed. */
export function togglePanel(): void {
  if (panelOpen.value) closePanel(); else openPanel();
}
