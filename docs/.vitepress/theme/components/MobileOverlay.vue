<script setup lang="ts">
/**
 * MobileOverlay.vue
 *
 * Dimming backdrop for the sidebar (PAGES) drawer at mobile viewports
 * (≤ 1099 px). On desktop the drawer is fixed-position but the page
 * remains usable alongside it, so no backdrop renders. At mobile the
 * drawer covers content and the backdrop signals that interaction is
 * captured. Tapping the backdrop closes the drawer.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';

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

const visible = computed<boolean>(() => isNarrow.value && !sidebarCollapsed.value);

function dismiss(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.add('iridis-sidebar-collapsed');
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
