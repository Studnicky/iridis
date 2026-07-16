<script setup lang="ts">
defineProps<{
  label: string;
  note?: string;
  countLabel?: string;
  class?: string;
}>();
</script>

<template>
  <div
    class="rounded-lg border border-default p-3"
    :class="$props.class"
  >
    <div
      v-if="$slots.default"
      class="mb-2"
    >
      <slot />
    </div>
    <div
      v-if="countLabel || $slots.header"
      class="mb-1 flex items-center justify-between gap-2"
    >
      <slot name="header">
        <span class="text-sm font-medium text-highlighted">{{ label }}</span>
      </slot>
      <MicroNote
        v-if="countLabel"
      >
        {{ countLabel }}
      </MicroNote>
    </div>
    <MonoValue
      v-else
    >
      {{ label }}
    </MonoValue>
    <MicroNote
      v-if="note"
    >
      {{ note }}
    </MicroNote>
  </div>
</template>
