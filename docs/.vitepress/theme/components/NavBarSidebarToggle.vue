<script setup lang="ts">
/**
 * NavBarSidebarToggle.vue
 *
 * The universal sidebar toggle, mounted into the navbar via the
 * nav-bar-content-after slot. Visible at every viewport.
 *
 * Toggles the iridis-sidebar-collapsed class on documentElement. The
 * class drives a fixed-position overlay drawer at every width (see
 * base.css). On mount the toggle seeds the class from viewport width:
 * desktop (>=1100px) starts open, mobile (<1100px) starts collapsed.
 */
import { onMounted, onUnmounted, ref } from 'vue';
import Button from 'primevue/button';

const collapsed = ref(true);
let observer: MutationObserver | null = null;

function syncFromDom(): void {
  if (typeof document === 'undefined') return;
  collapsed.value = document.documentElement.classList.contains('iridis-sidebar-collapsed');
}

onMounted(() => {
  if (typeof document === 'undefined') return;
  const narrow = typeof window !== 'undefined'
    ? window.matchMedia('(max-width: 1099px)').matches
    : true;
  document.documentElement.classList.toggle('iridis-sidebar-collapsed', narrow);
  syncFromDom();
  observer = new MutationObserver(syncFromDom);
  observer.observe(document.documentElement, { 'attributes': true, 'attributeFilter': ['class'] });
});

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});

function toggle(): void {
  if (typeof document === 'undefined') return;
  const next = !collapsed.value;
  collapsed.value = next;
  document.documentElement.classList.toggle('iridis-sidebar-collapsed', next);
}
</script>

<template>
  <ClientOnly>
    <Button
      class="iridis-nav-sidebar-toggle"
      severity="secondary"
      variant="text"
      :aria-pressed="!collapsed"
      :aria-label="collapsed ? 'Show pages menu' : 'Hide pages menu'"
      :title="collapsed ? 'Show pages menu' : 'Hide pages menu'"
      @click="toggle"
    >
      <span class="iridis-nav-sidebar-toggle__icon" aria-hidden="true">{{ collapsed ? '☰' : '✕' }}</span>
      <span class="iridis-nav-sidebar-toggle__label">Pages</span>
    </Button>
  </ClientOnly>
</template>

<style scoped>
.iridis-nav-sidebar-toggle {
  display: inline-flex;
}
.iridis-nav-sidebar-toggle :deep(.p-button) {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  background: color-mix(in oklch, var(--iridis-surface) 88%, var(--iridis-brand) 12%);
  border: 1px solid color-mix(in oklch, var(--iridis-divider) 60%, var(--iridis-brand) 40%);
  border-radius: var(--iridis-radius);
  color: var(--iridis-text);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  box-shadow: var(--iridis-shadow-sm);
  min-height: 2.4rem;
}
.iridis-nav-sidebar-toggle :deep(.p-button:hover) {
  background: color-mix(in oklch, var(--iridis-surface) 75%, var(--iridis-brand) 25%);
  border-color: color-mix(in oklch, var(--iridis-divider) 30%, var(--iridis-brand) 70%);
  color: var(--iridis-brand);
}
.iridis-nav-sidebar-toggle :deep(.p-button[aria-pressed="true"]) {
  background: color-mix(in oklch, var(--iridis-brand) 18%, var(--iridis-surface));
  border-color: color-mix(in oklch, var(--iridis-brand) 60%, var(--iridis-divider));
  color: var(--iridis-brand);
}
.iridis-nav-sidebar-toggle__icon {
  font-size: 0.95rem;
  line-height: 1;
  color: color-mix(in oklch, var(--iridis-brand) 80%, var(--iridis-text));
}
.iridis-nav-sidebar-toggle__label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
@media (max-width: 480px) {
  .iridis-nav-sidebar-toggle__label {
    display: none;
  }
}
</style>
