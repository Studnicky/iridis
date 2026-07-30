<script setup lang="ts">
import { viewerActionsModel } from '~/components/content/viz/viewerActionsModel.ts';

const props = withDefaults(defineProps<{
  actions: readonly ReturnType<typeof viewerActionsModel.create>[];
  variant?: 'header' | 'overlay';
}>(), {
  'variant': 'header',
});

const emit = defineEmits<{
  (event: 'action', id: Parameters<typeof viewerActionsModel.create>[0]): void;
}>();
</script>

<template>
  <div
    class="dagonizer-viewer-actions"
    :class="{ 'dagonizer-viewer-actions--overlay': variant === 'overlay' }"
  >
    <button
      v-for="action in props.actions"
      :key="action.id"
      class="dagonizer-viewer-action"
      :class="{ 'dagonizer-viewer-action--danger': action.tone === 'danger' }"
      type="button"
      :title="action.title"
      :aria-label="action.ariaLabel ?? action.title"
      :aria-pressed="action.pressed"
      :disabled="action.disabled === true"
      @click="emit('action', action.id)"
    >
      {{ action.label }}
    </button>
  </div>
</template>
