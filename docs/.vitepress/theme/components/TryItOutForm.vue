<script setup lang="ts">
/**
 * TryItOutForm.vue
 *
 * Inline variant of the global config form. Lives on the "Try it out"
 * docs page. Shares the configStore with the right-panel accordion and
 * every IridisDemo. The reset button is a PrimeVue Button styled to
 * match the inline-form chrome.
 */

import Button            from 'primevue/button';

import SchemaForm        from './SchemaForm.vue';
import { docsConfigSchema } from '../schemas/docsConfig.schema.ts';
import { configStore, resetConfig } from '../stores/configStore.ts';
</script>

<template>
  <ClientOnly>
    <section class="try-it-form">
      <SchemaForm :schema="docsConfigSchema" :model-value="configStore" />
      <Button
        type="button"
        label="Reset to defaults"
        severity="secondary"
        size="small"
        class="try-it-form__reset"
        @click="resetConfig"
      />
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
}
.try-it-form__reset :deep(.p-button) {
  padding: 0.4rem 0.75rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}
.try-it-form__reset :deep(.p-button:hover) {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
</style>
