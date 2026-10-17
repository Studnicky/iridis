<script setup lang="ts">
import { AliasColorEntity } from '~/theme/entities/AliasColorEntity.ts';

defineProps<{
  counts: Readonly<Record<string, number>>;
  variant: 'solid' | 'soft' | 'outline' | 'ghost';
}>();

const emit = defineEmits<{
  fire: [color: AliasColorEntity.Type];
}>();

const colors = [AliasColorEntity.Values[0], AliasColorEntity.Values[6]] as const;
</script>

<template>
  <div class="flex items-center gap-1.5">
    <span class="w-14 shrink-0 text-xs text-dimmed">{{ variant }}</span>
    <UButton
      v-for="color in colors"
      :key="color"
      :color="color"
      :variant="variant"
      size="xs"
      @click="emit('fire', color)"
    >
      {{ counts[`${variant}-${color}`] ?? 0 }}
    </UButton>
  </div>
</template>
