<script setup lang="ts">
/**
 * TryItOutForm.vue
 *
 * Inline (no accordion) variant of the global config form. Lives on the
 * "Try it out" docs page. Shares the configStore with the sidebar
 * accordion (now removed) and every IridisDemo.
 */

import SchemaForm        from './SchemaForm.vue';
import { docsConfigSchema } from '../schemas/docsConfig.schema.ts';
import { configStore, resetConfig } from '../stores/configStore.ts';
</script>

<template>
  <ClientOnly>
    <section class="try-it-form">
      <SchemaForm :schema="docsConfigSchema" :model-value="configStore" />
      <button class="try-it-form__reset" type="button" @click="resetConfig">
        Reset to defaults
      </button>
    </section>
  </ClientOnly>
</template>

<style scoped>
.try-it-form {
  margin: 1.25rem 0;
  padding: 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
.try-it-form__reset {
  margin-top: 1rem;
  padding: 0.4rem 0.75rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.try-it-form__reset:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
</style>
