<script setup lang="ts">
import { computed } from 'vue';
import { buildUploadedImageHeaderModel } from './uploadedImage/buildUploadedImageHeaderModel.ts';

const props = defineProps<{
  name: string;
  src: string;
  dominantColorCount: number;
  showHeader: boolean;
}>();

const emit = defineEmits<{
  remove: [];
}>();

const headerModel = computed(() => buildUploadedImageHeaderModel(
  props.name,
  props.dominantColorCount,
  props.showHeader
));
</script>

<template>
  <div
    v-if="headerModel.showInlineHeader"
    class="flex items-center gap-3"
  >
    <img
      :src="props.src"
      :alt="props.name"
      class="h-14 w-14 shrink-0 rounded-md object-cover border border-default"
    >
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-highlighted">
        {{ props.name }}
      </p>
      <p class="text-xs text-muted">
        {{ headerModel.countLabel }}
      </p>
    </div>
    <UButton
      icon="i-material-symbols-close-rounded"
      color="error"
      variant="ghost"
      size="xs"
      :aria-label="headerModel.removeAriaLabel"
      @click="emit('remove')"
    />
  </div>
  <UButton
    v-else
    icon="i-material-symbols-close-rounded"
    color="error"
    variant="ghost"
    size="xs"
    class="absolute top-2 right-2 z-10"
    :aria-label="headerModel.removeAriaLabel"
    @click="emit('remove')"
  />
</template>
