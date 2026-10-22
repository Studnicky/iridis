<script setup lang="ts">
import type { ContrastChoiceModels } from './contrastChoiceModels.ts';

const props = defineProps<{
  model: typeof ContrastChoiceModels.cvdMode;
  selected: string;
}>();

const emit = defineEmits<{
  update: [value: string];
}>();

function updateSelection(value: unknown): void {
  if (typeof value === 'string') {
    emit('update', value);
  }
}
</script>

<template>
  <SectionIntro
    :title="props.model.legend"
    :body="props.model.body"
  >
    <URadioGroup
      :model-value="props.selected"
      :items="[...props.model.items]"
      :legend="props.model.legend"
      orientation="horizontal"
      size="sm"
      @update:model-value="updateSelection"
    />
  </SectionIntro>
</template>
