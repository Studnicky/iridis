<script setup lang="ts">
/**
 * MobileOverlay.vue
 *
 * Dimming backdrop for the drawers at mobile viewports only.
 * Drawers are fixed-position overlays at every viewport, but on
 * desktop (>=1100px) the page stays fully readable alongside them
 * so no backdrop is rendered. At mobile (<=1099px) the drawers
 * cover content and the backdrop signals that interaction is
 * captured.
 *
 * Visibility is driven by the union of three states:
 *
 *   - `isNarrow` from matchMedia (viewport <=1099px)
 *   - `panelOpen` from the panelState store (builder drawer open)
 *   - `!iridis-sidebar-collapsed` on documentElement (pages drawer open)
 *
 * Tapping the backdrop closes whichever surface is currently open.
 * If both happen to be open simultaneously, the pages drawer takes
 * precedence (it sits "above" the builder in our z-order).
 */

import { computed, onMounted, onUnmounted, ref } from 'vue';

import { closePanel, panelOpen } from '../stores/panelState.ts';

const sidebarCollapsed = ref(true);
const isNarrow = ref(false);
let observer: MutationObserver | null = null;
let mql: MediaQueryList | null = null;
let onMqlChange: ((event: MediaQueryListEvent) => void) | null = null;

function readSidebarState(): void {
  if (typeof document === 'undefined') return;
  sidebarCollapsed.value = document.documentElement.classList.contains('iridis-sidebar-collapsed');
}

onMounted(() => {
  if (typeof document === 'undefined') return;
  readSidebarState();
  observer = new MutationObserver(readSidebarState);
  observer.observe(document.documentElement, { 'attributes': true, 'attributeFilter': ['class'] });

  if (typeof window !== 'undefined') {
    mql = window.matchMedia('(max-width: 1099px)');
    isNarrow.value = mql.matches;
    onMqlChange = (event: MediaQueryListEvent): void => {
      isNarrow.value = event.matches;
    };
    mql.addEventListener('change', onMqlChange);
  }
});

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
  if (mql && onMqlChange) {
    mql.removeEventListener('change', onMqlChange);
  }
  mql = null;
  onMqlChange = null;
});

const visible = computed<boolean>(() => isNarrow.value && (panelOpen.value || !sidebarCollapsed.value));

function dismiss(): void {
  if (typeof document === 'undefined') return;
  // Pages drawer takes precedence — if it's open, close it first; the
  // builder stays in whatever state the user left it.
  if (!sidebarCollapsed.value) {
    document.documentElement.classList.add('iridis-sidebar-collapsed');
    return;
  }
  if (panelOpen.value) closePanel();
}
</script>

<template>
  <ClientOnly>
    <div
      v-show="visible"
      class="iridis-mobile-overlay"
      :aria-hidden="!visible"
      @click="dismiss"
    />
  </ClientOnly>
</template>

<style scoped>
/* Backdrop is rendered only at mobile (<=1099px); the v-show binding
   gates it on the matchMedia state, so on desktop the element exists
   but stays hidden and never paints. */
.iridis-mobile-overlay {
  display: block;
  position: fixed;
  inset: 0;
  z-index: 28;
  background: color-mix(in oklch, var(--iridis-background) 55%, transparent);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  cursor: pointer;
  animation: iridis-overlay-fade-in 180ms cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes iridis-overlay-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
