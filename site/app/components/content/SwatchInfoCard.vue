<script setup lang="ts">
import { computed } from 'vue';
import { buildSwatchInfoCardModel } from './buildSwatchInfoCardModel.ts';

const props = withDefaults(defineProps<{
  ariaLabel?: string;
  class?: string;
  hex: string;
  label: string;
  surface?: 'plain' | 'elevated';
  swatchClass?: string;
  variant?: 'row' | 'tile';
}>(), {
  surface: 'plain',
  variant: 'row'
});
const cardModel = computed(() => buildSwatchInfoCardModel(props.variant, props.surface));
</script>

<template>
  <div
    :class="[cardModel.cardClass, cardModel.surfaceClass, $props.class]"
  >
    <SwatchChip
      :hex="props.hex"
      :class="props.swatchClass ?? cardModel.swatchClass"
      :aria-label="props.ariaLabel ?? `${props.label} ${props.hex}`"
    />
    <div :class="cardModel.bodyClass">
      <slot name="title">
        <div :class="cardModel.titleClass">
          {{ props.label }}
        </div>
      </slot>
      <slot />
    </div>
  </div>
</template>
