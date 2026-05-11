/**
 * Tiny global toggle for the right panel so any component (the panel
 * itself, the home page CTA, the navbar) can call open/close/toggle
 * and observe `panelOpen` without prop-drilling.
 */

import { ref } from 'vue';

/** Reactive flag. Open by default so designers see the builder immediately;
 *  the close button or sticky tab toggles it. */
export const panelOpen = ref(true);

/** Opens the right panel and, on narrow viewports where it stacks below
 *  content, scrolls it into view so the user notices it appearing. */
export function openPanel(): void {
  panelOpen.value = true;
  if (typeof document !== 'undefined') {
    requestAnimationFrame(() => {
      const el = document.querySelector('.iridis-right');
      if (el && window.innerWidth < 1100) el.scrollIntoView({ 'behavior': 'smooth', 'block': 'start' });
    });
  }
}

/** Closes the right panel. */
export function closePanel(): void {
  panelOpen.value = false;
}

/** Toggles the right panel between open and closed. */
export function togglePanel(): void {
  if (panelOpen.value) closePanel(); else openPanel();
}
