<script setup lang="ts">
import type { buildInteractablesShowcaseModel } from './interactables/buildInteractablesShowcaseModel.ts';

defineProps<{
  items: ReturnType<typeof buildInteractablesShowcaseModel.build>['accordionItems'];
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
