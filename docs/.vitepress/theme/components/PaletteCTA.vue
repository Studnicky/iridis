<script setup lang="ts">
/**
 * PaletteCTA.vue
 *
 * Designer-first call-to-action button. Opens the right panel via the
 * shared panelState store. PrimeVue Button paints with brand tokens
 * from the iridis preset; the wrapper adds the lift/shadow recipe and
 * label-flip behavior based on panel state.
 */

import { computed } from 'vue';
import Button       from 'primevue/button';

import { panelOpen, openPanel } from '../stores/panelState.ts';

const label = computed(() => panelOpen.value ? 'Builder open ↘' : 'Build a palette →');
</script>

<template>
  <ClientOnly>
    <Button
      type="button"
      :label="label"
      :aria-pressed="panelOpen"
      class="iridis-cta"
      @click="openPanel"
    />
  </ClientOnly>
</template>

<style scoped>
.iridis-cta :deep(.p-button) {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.3rem;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  background: var(--iridis-brand);
  color: var(--iridis-on-brand);
  border: 1px solid var(--iridis-brand);
  border-radius: var(--iridis-radius-md);
  box-shadow: var(--iridis-shadow-felt);
  transition:
    background-color var(--iridis-transition),
    color            var(--iridis-transition),
    box-shadow       var(--iridis-transition),
    filter           var(--iridis-transition),
    transform 120ms cubic-bezier(0.4, 0, 0.2, 1);
}
.iridis-cta :deep(.p-button:hover) {
  filter: brightness(1.08);
  box-shadow: var(--iridis-shadow-felt-hover);
  transform: translateY(-1px);
}
.iridis-cta :deep(.p-button:active) {
  box-shadow: var(--iridis-shadow-pressed);
  transform: translateY(0);
}
</style>
