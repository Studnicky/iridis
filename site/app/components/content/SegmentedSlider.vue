<script setup lang="ts" generic="T extends string | number">
import {
  segmentedSliderIndexFor,
  segmentedSliderValueAt,
  type SegmentedSliderItem
} from './buildSegmentedSliderModel.ts';

const props = defineProps<{
  items: readonly SegmentedSliderItem<T>[];
  modelValue: T;
  minWidth?: number;
  gap?: number;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: T] }>();
</script>

<template>
  <div class="w-full space-y-2">
    <BalancedWrap
      :items="[...items]"
      :min-width="minWidth ?? 48"
      :gap="gap ?? 8"
    >
      <template #default="{ item }">
        <button
          type="button"
          class="segmented-slider-pill flex-1 justify-center text-[11px] font-medium"
          :class="modelValue === item.value ? 'text-primary font-bold' : 'cursor-pointer text-dimmed hover:text-muted'"
          :aria-pressed="modelValue === item.value"
          @click="emit('update:modelValue', item.value)"
        >
          {{ item.label }}
        </button>
      </template>
    </BalancedWrap>
    <USlider
      :model-value="segmentedSliderIndexFor(items, modelValue)"
      :min="0"
      :max="items.length - 1"
      :step="1"
      @update:model-value="emit('update:modelValue', segmentedSliderValueAt(items, Number($event), modelValue))"
    />
  </div>
</template>

<style scoped>
.segmented-slider-pill {
  display: flex;
  align-items: center;
  padding: 0.15rem 0;
  background: transparent;
  border: none;
}
</style>
