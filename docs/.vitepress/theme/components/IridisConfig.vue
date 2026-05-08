<script setup lang="ts">
/**
 * IridisConfig.vue
 *
 * Sidebar accordion containing the global docs configuration form. Mounted
 * into the sidebar-nav-after slot so it sits below the navigation links.
 *
 * The accordion is closed by default to keep the sidebar quiet. Opening it
 * exposes the SchemaForm bound to the global config store. Every change
 * propagates through the store via reactivity, hits localStorage on the
 * next tick, and re-runs every IridisDemo on the page.
 */

import { ref } from 'vue';

import SchemaForm        from './SchemaForm.vue';
import { docsConfigSchema } from '../schemas/docsConfig.schema.ts';
import { configStore, resetConfig } from '../stores/configStore.ts';

const open = ref(false);
</script>

<template>
  <ClientOnly>
    <section class="iridis-config" :class="{ 'iridis-config--open': open }">
      <button
        class="iridis-config__toggle"
        type="button"
        :aria-expanded="open"
        aria-controls="iridis-config-panel"
        @click="open = !open"
      >
        <span class="iridis-config__toggle-text">Configure docs</span>
        <span class="iridis-config__toggle-chevron" aria-hidden="true">{{ open ? '▾' : '▸' }}</span>
      </button>

      <div v-show="open" id="iridis-config-panel" class="iridis-config__panel">
        <p class="iridis-config__intro">
          Your settings drive every live demo on this site and persist across pages.
        </p>
        <SchemaForm :schema="docsConfigSchema" :model-value="configStore" />
        <button class="iridis-config__reset" type="button" @click="resetConfig">
          Reset to defaults
        </button>
      </div>
    </section>
  </ClientOnly>
</template>

<style scoped>
.iridis-config {
  margin: 1rem 0 1.5rem;
  padding: 0.75rem 0 0;
  border-top: 1px solid var(--vp-c-divider);
}
.iridis-config__toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: var(--vp-c-text-2);
}
.iridis-config__toggle-text {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.iridis-config__toggle-chevron {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}
.iridis-config__toggle:hover {
  color: var(--vp-c-brand-1);
}
.iridis-config__panel {
  margin-top: 0.5rem;
  padding: 0.65rem 0 0;
}
.iridis-config__intro {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  margin: 0 0 0.85rem;
  line-height: 1.4;
}
.iridis-config__reset {
  margin-top: 0.85rem;
  padding: 0.35rem 0.6rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.iridis-config__reset:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
</style>
