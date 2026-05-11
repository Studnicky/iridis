<script setup lang="ts">
/**
 * SidebarToggle.vue — sticky-tab pattern, PrimeVue-extended.
 *
 * A vertical pill anchored to the viewport's left edge. When the sidebar
 * is open the tab rides the sidebar's right edge; when closed it sits at
 * the viewport's left edge. The arrow flips direction so the tab always
 * invites the action that is currently available (left to close, right
 * to open).
 *
 * On narrow viewports the sidebar drops from the top instead. The tab
 * is rotated to horizontal via the iridis-sidebar-tab CSS class and
 * pinned to the top of the viewport.
 *
 * Built on PrimeVue Button; the vertical-text layout, edge anchoring,
 * and asymmetric corner radius come from the iridis-sidebar-tab class
 * defined in base.css.
 */

import { onMounted, ref } from 'vue';
import Button from 'primevue/button';

const collapsed = ref(true);

onMounted(() => {
  if (typeof document === 'undefined') return;
  const narrow = window.matchMedia('(max-width: 1099px)').matches;
  collapsed.value = narrow;
  document.documentElement.classList.toggle('iridis-sidebar-collapsed', collapsed.value);
});

function toggle(): void {
  if (typeof document === 'undefined') return;
  collapsed.value = !collapsed.value;
  document.documentElement.classList.toggle('iridis-sidebar-collapsed', collapsed.value);
}
</script>

<template>
  <ClientOnly>
    <Button
      :class="['iridis-sidebar-tab', { 'iridis-sidebar-tab--open': !collapsed }]"
      severity="secondary"
      :aria-pressed="!collapsed"
      :aria-label="collapsed ? 'Show sidebar' : 'Hide sidebar'"
      :title="collapsed ? 'Show sidebar' : 'Hide sidebar'"
      @click="toggle"
    >
      <span class="iridis-sidebar-tab__arrow" aria-hidden="true">{{ collapsed ? '▶' : '◀' }}</span>
      <span class="iridis-sidebar-tab__label">Pages</span>
    </Button>
  </ClientOnly>
</template>
