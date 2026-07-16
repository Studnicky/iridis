<script setup lang="ts">
defineProps<{
  class?: string;
  glow: string;
  pulseColor?: string;
  title: string;
  titleColor?: string;
}>();
</script>

<template>
  <div
    class="glass scanlines h-full p-5"
    :class="$props.class"
    :style="{ '--glow': glow }"
  >
    <div class="mb-3 flex items-center justify-between">
      <span
        class="font-display text-sm font-bold uppercase tracking-widest glow-text"
        :style="titleColor ? { color: titleColor } : undefined"
      >{{ title }}</span>
      <span
        class="h-3 w-3 rounded-full pulse"
        :style="pulseColor ? { backgroundColor: pulseColor } : undefined"
        :class="pulseColor ? undefined : 'bg-primary'"
      />
    </div>
    <slot />
  </div>
</template>
