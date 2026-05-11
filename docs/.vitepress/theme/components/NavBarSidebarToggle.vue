<script setup lang="ts">
/**
 * NavBarSidebarToggle.vue
 *
 * The universal sidebar toggle, mounted into the main navbar menu.
 * Visible at large viewports only; hidden at mobile via CSS. At mobile
 * the page tree is reachable through the existing VitePress mobile
 * screen.
 *
 * Toggles the iridis-sidebar-collapsed class on documentElement. The
 * class drives a fixed-position overlay drawer at every width (see
 * base.css). On mount the toggle starts uncollapsed at every viewport
 * so the pages drawer is open by default.
 */
import { onMounted, onUnmounted, ref } from 'vue';
import Button from 'primevue/button';

const collapsed = ref(false);
let observer: MutationObserver | null = null;

function syncFromDom(): void {
  if (typeof document === 'undefined') return;
  collapsed.value = document.documentElement.classList.contains('iridis-sidebar-collapsed');
}

onMounted(() => {
  if (typeof document === 'undefined') return;
  // Always start uncollapsed at every viewport. The user can collapse
  // via this toggle; we never seed the collapsed state from matchMedia.
  document.documentElement.classList.remove('iridis-sidebar-collapsed');
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
/* Hide PAGES toggle at mobile; the page tree is reachable via the
   VitePress mobile screen at narrow widths. The Example/builder
   toggle stays visible at every viewport. */
@media (max-width: 1099px) {
  .iridis-nav-sidebar-toggle {
    display: none;
  }
}
.iridis-nav-sidebar-toggle :deep(.p-button) {
  position: relative;
  isolation: isolate;
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
/* The active-state highlight is painted by a ::before pseudo pinned
   to z-index 0 inside the button's isolation context. Label and icon
   children sit at z-index 1, so the tint reads as a background fill
   underneath the content rather than an overlay on top of it. */
.iridis-nav-sidebar-toggle :deep(.p-button)::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: transparent;
  z-index: 0;
  pointer-events: none;
  transition: background 160ms ease;
}
.iridis-nav-sidebar-toggle :deep(.p-button) > * {
  position: relative;
  z-index: 1;
}
.iridis-nav-sidebar-toggle :deep(.p-button:hover) {
  border-color: color-mix(in oklch, var(--iridis-divider) 30%, var(--iridis-brand) 70%);
  color: var(--iridis-brand);
}
.iridis-nav-sidebar-toggle :deep(.p-button:hover)::before {
  background: color-mix(in oklch, var(--iridis-brand) 10%, transparent);
}
.iridis-nav-sidebar-toggle :deep(.p-button[aria-pressed="true"]) {
  border-color: color-mix(in oklch, var(--iridis-brand) 60%, var(--iridis-divider));
  color: var(--iridis-brand);
}
.iridis-nav-sidebar-toggle :deep(.p-button[aria-pressed="true"])::before {
  background: color-mix(in oklch, var(--iridis-brand) 14%, transparent);
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
</style>
