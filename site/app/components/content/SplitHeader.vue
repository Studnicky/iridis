<script setup lang="ts">
import { splitHeaderRowClass } from './buildContentPresentationModel.ts';

const props = withDefaults(defineProps<{
  align?: 'center' | 'start';
  class?: string;
}>(), {
  align: 'center'
});
</script>

<template>
  <div
    :class="[splitHeaderRowClass(props.align), $props.class]"
  >
    <div class="min-w-0 flex-1">
      <slot />
    </div>
    <div
      v-if="$slots.meta"
      class="shrink-0"
    >
      <slot name="meta" />
    </div>
  </div>
</template>
