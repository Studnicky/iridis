<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
}>();
</script>

<template>
  <div class="rounded border border-default/30 bg-muted p-2">
    <div class="text-[10px] uppercase text-dimmed">
      {{ label }}
    </div>
    <div class="font-mono font-bold text-primary">
      {{ value }}
    </div>
  </div>
</template>
