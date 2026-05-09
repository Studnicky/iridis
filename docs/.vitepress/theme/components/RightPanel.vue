<script setup lang="ts">
/**
 * RightPanel.vue
 *
 * Persistent example builder, mounted via the aside-top slot. Replaces
 * vitepress's default right-rail outline (disabled in theme.config.ts).
 * Always shows the same IridisDemo running the canonical full pipeline,
 * sharing configStore with the left-sidebar configuration form.
 *
 * Collapsible — the chevron tucks the panel to the right edge so the
 * page can use the full width when needed. State is local; no persistence
 * (the panel default-open state is part of the page UX).
 */

import { ref } from 'vue';

import IridisDemo from './IridisDemo.vue';

const FULL_PIPELINE: readonly string[] = [
  'intake:hex',
  'clamp:count',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'derive:variant',
  'emit:json',
];

const open = ref(true);
</script>

<template>
  <ClientOnly>
    <aside :class="['iridis-right', { 'iridis-right--collapsed': !open }]" aria-label="Live example builder">
      <button
        type="button"
        class="iridis-right__toggle"
        :aria-expanded="open"
        :aria-label="open ? 'Collapse example panel' : 'Expand example panel'"
        @click="open = !open"
      >
        <span class="iridis-right__toggle-chevron" aria-hidden="true">{{ open ? '›' : '‹' }}</span>
      </button>

      <div v-show="open" class="iridis-right__body">
        <header class="iridis-right__header">
          <span class="iridis-right__eyebrow">Live example</span>
          <h2 class="iridis-right__title">Try iridis on this page</h2>
          <p class="iridis-right__sub">
            Pick seeds. Every chrome and syntax token recomputes. The whole site is one engine pass.
          </p>
        </header>
        <IridisDemo :pipeline="FULL_PIPELINE" />
      </div>
    </aside>
  </ClientOnly>
</template>

<style scoped>
.iridis-right {
  position: sticky;
  top: calc(var(--vp-nav-height, 64px) + 1rem);
  width: var(--iridis-right-panel-width, 360px);
  max-height: calc(100vh - var(--vp-nav-height, 64px) - 2rem);
  overflow: hidden;
  border-radius: 14px;
  background:
    linear-gradient(160deg, color-mix(in oklch, var(--iridis-surface) 92%, var(--iridis-brand) 8%) 0%,
                            color-mix(in oklch, var(--iridis-surface) 96%, var(--iridis-text)  4%) 100%);
  border: 1px solid color-mix(in oklch, var(--iridis-divider) 80%, var(--iridis-brand) 20%);
  box-shadow:
    0 14px 40px -10px rgba(0, 0, 0, 0.45),
    0 2px  6px -2px  rgba(0, 0, 0, 0.30),
    inset 0 1px 0    rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(8px);
  transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.iridis-right--collapsed {
  width: 2rem;
}
.iridis-right__toggle {
  position: absolute;
  top: 0.4rem;
  left: 0.3rem;
  z-index: 2;
  width: 1.4rem;
  height: 1.4rem;
  padding: 0;
  background: color-mix(in oklch, var(--iridis-surface) 70%, var(--iridis-brand) 30%);
  border: 1px solid color-mix(in oklch, var(--iridis-divider) 50%, var(--iridis-brand) 50%);
  border-radius: 50%;
  color: var(--iridis-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  line-height: 1;
  font-weight: 700;
  transition: transform 120ms;
}
.iridis-right__toggle:hover {
  transform: scale(1.08);
  border-color: var(--iridis-brand);
}
.iridis-right__body {
  padding: 0.85rem 0.95rem 1rem;
  overflow: auto;
  max-height: calc(100vh - var(--vp-nav-height, 64px) - 2rem);
}
.iridis-right__header {
  margin: 0.4rem 0 0.85rem;
  padding: 0 0.05rem;
}
.iridis-right__eyebrow {
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--iridis-brand);
  background: color-mix(in oklch, var(--iridis-brand) 12%, transparent);
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  border: 1px solid color-mix(in oklch, var(--iridis-brand) 35%, transparent);
}
.iridis-right__title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0.5rem 0 0.3rem;
  color: var(--iridis-text);
  letter-spacing: -0.01em;
  border: 0;
  padding: 0;
}
.iridis-right__sub {
  font-size: 0.78rem;
  color: var(--iridis-muted);
  margin: 0 0 0.85rem;
  line-height: 1.45;
}
</style>
