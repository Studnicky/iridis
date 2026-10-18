<script setup lang="ts">
import { computed } from 'vue';
import { buildContrastStrictnessModel } from './buildContrastStrictnessModel.ts';

const props = defineProps<{
  strictness: number;
}>();

const emit = defineEmits<{
  update: [strictness: number];
}>();

function setStrictness(strictness: number): void {
  emit('update', strictness);
}

function updateStrictness(strictness: number | undefined): void {
  if (strictness !== undefined) {
    setStrictness(strictness);
  }
}

const strictnessModel = computed(() => buildContrastStrictnessModel.build(props.strictness));
</script>

<template>
  <SectionIntro title="Compliance strictness">
    <template #body>
      <strong class="text-highlighted">{{ strictnessModel.selectedLabelText }}</strong>
      {{ ` ${strictnessModel.body.replace(/^[A-Z]+ /, '')}` }}
    </template>
    <div class="w-full space-y-2">
      <div class="flex w-full justify-between text-[11px] font-medium text-dimmed">
        <span
          v-for="option in strictnessModel.options"
          :key="option.labelText"
          :class="option.interactionClass"
          @click="setStrictness(option.value)"
        >{{ option.labelText }}</span>
      </div>
      <USlider
        :model-value="props.strictness"
        :min="0"
        :max="2"
        :step="1"
        @update:model-value="updateStrictness"
      />
    </div>
  </SectionIntro>
</template>
