/**
 * panelState.ts
 *
 * Tiny global toggle for the right panel. Lets ANY component (the right
 * panel itself, the home page CTA, the navbar) call openPanel/closePanel/
 * togglePanel and observe the open ref. Avoids prop-drilling.
 */

import { ref } from 'vue';

// Default: closed on initial load. The "Build a palette" CTA opens it,
// or the user can drag it open from the collapsed reopen handle.
export const panelOpen = ref(false);

export function openPanel(): void {
  panelOpen.value = true;
  if (typeof document !== 'undefined') {
    // On narrow viewports the panel is stacked below content; scroll it
    // into view so the user can see what just opened.
    requestAnimationFrame(() => {
      const el = document.querySelector('.iridis-right');
      if (el && window.innerWidth < 1100) el.scrollIntoView({ 'behavior': 'smooth', 'block': 'start' });
    });
  }
}
export function closePanel(): void {
  panelOpen.value = false;
}
export function togglePanel(): void {
  if (panelOpen.value) closePanel(); else openPanel();
}
