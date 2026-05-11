/**
 * Tiny global toggle for the right panel so any component (the panel
 * itself, the home page CTA, the navbar) can call open/close/toggle
 * and observe `panelOpen` without prop-drilling.
 *
 * Defaults differ by viewport: desktop (>=1100px) starts open so designers
 * see the builder immediately; mobile (<1100px) starts closed so the
 * drawer does not cover content on first paint. The initial value is
 * resolved against window.matchMedia when the module loads in the
 * browser; SSR/non-browser environments default to closed.
 */

import { ref } from 'vue';

function resolveInitialOpen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 1100px)').matches;
}

/** Reactive flag. Desktop defaults open, mobile defaults closed. */
export const panelOpen = ref(resolveInitialOpen());

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
