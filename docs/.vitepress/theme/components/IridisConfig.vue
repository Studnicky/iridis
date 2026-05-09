<script setup lang="ts">
/**
 * IridisConfig.vue
 *
 * Sidebar accordion holding the global docs configuration. Mounts via
 * sidebar-nav-after slot. The right-panel <IridisDemo> picks colors via
 * its in-place picker; this accordion exposes the broader knobs (framing,
 * contrast level, role schema, color space) that don't have inline
 * controls in the demo.
 */

import { ref } from 'vue';

import SchemaForm        from './SchemaForm.vue';
import { docsConfigSchema } from '../schemas/docsConfig.schema.ts';
import { configStore, resetConfig } from '../stores/configStore.ts';

const open = ref(false);
</script>

<template>
  <ClientOnly>
    <section :class="['iridis-config', { 'iridis-config--open': open }]">
      <button
        class="iridis-config__toggle"
        type="button"
        :aria-expanded="open"
        aria-controls="iridis-config-panel"
        @click="open = !open"
      >
        <span class="iridis-config__chevron" aria-hidden="true">{{ open ? '▾' : '▸' }}</span>
        <span class="iridis-config__label">Configuration</span>
      </button>
      <div v-show="open" id="iridis-config-panel" class="iridis-config__panel">
        <p class="iridis-config__intro">
          Drives every demo on every page and the docs theme.
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
  margin: 0.4rem 0;
  padding-top: 0.85rem;
  border-top: 1px solid color-mix(in oklch, var(--vp-c-divider) 50%, transparent);
}
.iridis-config__toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: var(--vp-c-text-3);
}
.iridis-config__chevron { font-size: 0.7rem; }
.iridis-config__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.iridis-config__toggle:hover { color: var(--vp-c-brand-1); }
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
