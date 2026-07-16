<script setup lang="ts">
defineProps<{
  label: string;
  description: string;
  countLabel: string;
  hues: readonly number[];
  hexAt: (hue: number) => string;
}>();
</script>

<template>
  <SpecimenCard
    :label="label"
    :note="description"
    :count-label="countLabel"
    class="space-y-1.5"
  >
    <template #default>
      <div class="flex gap-1.5">
        <div
          v-for="(hue, index) in hues"
          :key="index"
          class="h-8 w-8 rounded border border-default shadow-inner"
          :style="{ backgroundColor: hexAt(hue) }"
          :title="`${Math.round(hue)}°`"
        />
      </div>
    </template>
  </SpecimenCard>
</template>
