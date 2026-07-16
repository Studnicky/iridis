<script setup lang="ts">
import { scrimBackground } from './buildContentPresentationModel.ts';

withDefaults(defineProps<{
  strength?: 'soft' | 'medium' | 'strong';
  class?: string;
}>(), {
  strength: 'medium',
  class: ''
});
</script>

<template>
  <div
    class="rounded-2xl px-4 py-2"
    :class="$props.class"
    :style="{ background: scrimBackground(strength) }"
  >
    <slot />
  </div>
</template>
