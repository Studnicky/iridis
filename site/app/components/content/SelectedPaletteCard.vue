<script setup lang="ts">
defineProps<{
  label: string;
  algorithmLabel: string;
  hexes: readonly string[];
}>();
</script>

<template>
  <GlowCard
    class="flex flex-1 max-w-xs flex-col gap-3 p-4"
    glow="var(--ui-primary)"
    :title="label"
  >
    <SwatchList
      :swatches="hexes"
      empty-label="None"
      :aria-label-prefix="`${label} color`"
      chip-class="h-7 w-7 rounded border border-default"
    />
    <UBadge
      color="neutral"
      variant="soft"
      size="sm"
      class="self-start"
    >
      {{ algorithmLabel }}
    </UBadge>
  </GlowCard>
</template>
