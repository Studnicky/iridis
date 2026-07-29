<script setup lang="ts">
defineProps<{
  title?: string;
  body?: string;
  class?: string;
}>();
</script>

<template>
  <div
    class="space-y-1"
    :class="$props.class"
  >
    <PanelHeading
      v-if="title"
      :title="title"
    />
    <p
      v-if="body"
      class="text-sm text-muted"
    >
      {{ body }}
    </p>
    <div
      v-else-if="$slots.body"
      class="text-sm text-muted"
    >
      <slot name="body" />
    </div>
    <slot />
  </div>
</template>
