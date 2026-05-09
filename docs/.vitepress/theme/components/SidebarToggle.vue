<script setup lang="ts">
/**
 * SidebarToggle.vue
 *
 * Floating button (top-left) that toggles the html.iridis-sidebar-collapsed
 * class. CSS in base.css translates the sidebar off-screen when the class
 * is present and shifts the content padding accordingly. Re-opening is the
 * same button — it tracks the sidebar's right edge.
 */

import { onMounted, ref } from 'vue';

const collapsed = ref(false);

onMounted(() => {
  if (typeof document === 'undefined') return;
  collapsed.value = document.documentElement.classList.contains('iridis-sidebar-collapsed');
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
      class="iridis-sidebar-toggle"
      :aria-pressed="collapsed"
      :aria-label="collapsed ? 'Show sidebar' : 'Hide sidebar'"
      :title="collapsed ? 'Show sidebar' : 'Hide sidebar'"
      @click="toggle"
    >
      {{ collapsed ? '›' : '‹' }}
    </button>
  </ClientOnly>
</template>
