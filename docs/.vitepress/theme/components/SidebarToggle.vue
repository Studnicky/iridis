<script setup lang="ts">
/**
 * SidebarToggle.vue — sticky-tab pattern.
 *
 * A vertical pill anchored to the viewport. When the sidebar is open the
 * tab rides the sidebar's right edge; when closed it sits at the viewport's
 * left edge. The arrow flips direction so the tab always *invites* the
 * action that's currently available (◀ to close, ▶ to open).
 *
 * On narrow viewports (<1099px) the sidebar is an accordion that drops
 * from the top instead — the tab is rotated horizontally and pinned to
 * the top of the viewport.
 */

import { onMounted, ref } from 'vue';

const collapsed = ref(true);  // default closed on narrow viewports

onMounted(() => {
  if (typeof document === 'undefined') return;
  // Default state: sidebar OPEN on desktop, CLOSED on narrow viewports.
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
    <button
      type="button"
      :class="['iridis-sidebar-tab', { 'iridis-sidebar-tab--open': !collapsed }]"
      :aria-pressed="!collapsed"
      :aria-label="collapsed ? 'Show sidebar' : 'Hide sidebar'"
      :title="collapsed ? 'Show sidebar' : 'Hide sidebar'"
      @click="toggle"
    >
      <span class="iridis-sidebar-tab__arrow" aria-hidden="true">{{ collapsed ? '▶' : '◀' }}</span>
      <span class="iridis-sidebar-tab__label">Pages</span>
    </button>
  </ClientOnly>
</template>
