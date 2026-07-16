<script setup lang="ts">
import type { AliasColorType } from '~/theme/types/aliasColor.ts';

defineProps<{
  counts: Readonly<Record<string, number>>;
  variant: 'solid' | 'soft' | 'outline' | 'ghost';
}>();

const emit = defineEmits<{
  fire: [color: AliasColorType];
}>();
</script>

<template>
  <div class="flex items-center gap-1.5">
    <span class="w-14 shrink-0 text-xs text-dimmed">{{ variant }}</span>
    <UButton
      v-for="c in (['primary', 'neutral'] as const)"
      :key="c"
      :color="c"
      :variant="variant"
      size="xs"
      @click="emit('fire', c)"
    >
      {{ counts[`${variant}-${c}`] ?? 0 }}
    </UButton>
  </div>
</template>
