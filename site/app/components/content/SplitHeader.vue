<script setup lang="ts">
import { computed } from 'vue';
import { buildContentPresentationModel } from './buildContentPresentationModel.ts';

const props = withDefaults(defineProps<{
  align?: 'center' | 'start';
  class?: string;
}>(), {
  align: 'center',
  class: undefined
});

const rowClass = computed(() => props.align === 'center'
  ? buildContentPresentationModel.splitHeaderCenteredRowClass
  : buildContentPresentationModel.splitHeaderStartRowClass
);
</script>

<template>
  <div
    :class="[rowClass, $props.class]"
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
