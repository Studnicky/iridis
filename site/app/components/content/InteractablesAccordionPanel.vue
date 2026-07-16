<script setup lang="ts">
import type { InteractablesAccordionItem } from './interactables/buildInteractablesShowcaseModel.ts';

defineProps<{
  items: readonly InteractablesAccordionItem[];
}>();
</script>

<template>
  <InfoPanel
    variant="default"
    label="UAccordion"
  >
    <UAccordion :items="[...items]">
      <template #body="{ item }">
        <p class="text-xs text-muted">
          {{ item.content }}
        </p>
      </template>
    </UAccordion>
  </InfoPanel>
</template>
