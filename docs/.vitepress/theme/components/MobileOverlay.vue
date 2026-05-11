<script setup lang="ts">
/**
 * MobileOverlay.vue
 *
 * Mobile-only dimming overlay that backs the pages drawer and the
 * builder bottom sheet. Renders a single backdrop element whose
 * visibility is driven by the union of two truthy states:
 *
 *   - `panelOpen` from the panelState store (builder sheet open)
 *   - `!iridis-sidebar-collapsed` on documentElement (pages drawer open)
 *
 * Tapping the backdrop closes whichever surface is currently open.
 * If both happen to be open simultaneously, the pages drawer takes
 * precedence (it sits "above" the builder in our z-order).
 *
 * The backdrop is hidden at viewports >= 1100px regardless of state.
 */

import { computed, onMounted, onUnmounted, ref } from 'vue';

import { closePanel, panelOpen } from '../stores/panelState.ts';

const sidebarCollapsed = ref(true);
let observer: MutationObserver | null = null;

function readSidebarState(): void {
  if (typeof document === 'undefined') return;
  sidebarCollapsed.value = document.documentElement.classList.contains('iridis-sidebar-collapsed');
}

onMounted(() => {
  if (typeof document === 'undefined') return;
  readSidebarState();
  observer = new MutationObserver(readSidebarState);
  observer.observe(document.documentElement, { 'attributes': true, 'attributeFilter': ['class'] });
});

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});

const visible = computed<boolean>(() => panelOpen.value || !sidebarCollapsed.value);

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
.iridis-mobile-overlay {
  display: none;
}
@media (max-width: 1099px) {
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
}
@keyframes iridis-overlay-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
