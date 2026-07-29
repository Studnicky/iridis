<script setup lang="ts">
defineProps<{
  label: string;
  hex?: string;
  isLeaf?: boolean;
  derivedFrom?: string;
}>();
</script>

<template>
  <span class="flex items-center gap-1.5">
    <span
      v-if="hex"
      class="h-3 w-3 shrink-0 rounded-full border border-default"
      :style="{ backgroundColor: hex }"
    />
    <span class="font-mono text-xs">{{ label }}</span>
    <UBadge
      v-if="isLeaf"
      :color="derivedFrom ? 'neutral' : 'success'"
      variant="soft"
      size="xs"
    >
      {{ derivedFrom ? `← ${derivedFrom}` : 'resolved' }}
    </UBadge>
  </span>
</template>
