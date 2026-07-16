<script setup lang="ts">
defineProps<{
  label: string;
  percent: number;
}>();
</script>

<template>
  <InfoPanel
    variant="default"
    :label="label"
    class="lg:col-span-2"
  >
    <PanelMeta>
      <span class="text-xs font-medium uppercase tracking-wide text-dimmed">{{ percent }}%</span>
    </PanelMeta>
    <UProgress :model-value="percent" />
  </InfoPanel>
</template>
