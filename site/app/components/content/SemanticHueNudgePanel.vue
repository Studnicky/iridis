<script setup lang="ts">
defineProps<{
  enabled: boolean;
  clampDegrees: number;
  entries: readonly { role: string; hue: number; familyName: string }[];
}>();

const emit = defineEmits<{
  toggle: [value: boolean];
}>();
</script>

<template>
  <InfoPanel
    variant="default"
    label="Semantic hue nudge"
    class="space-y-2 border-default/50"
  >
    <div class="flex justify-end">
      <USwitch
        :model-value="enabled"
        @update:model-value="emit('toggle', $event as boolean)"
      />
    </div>
    <p class="text-xs text-muted">
      Independent of the relations below — <code class="font-mono">derive:semanticHues</code> nudges
      success/warning/error/info toward their conventional meaning, bounded to
      ±{{ clampDegrees }}° so a role never jumps to a hue absent from your actual palette (e.g. a
      red-dominant image still yields a warm-leaning, not pure-green, success). Turn it off to let those
      4 roles resolve purely from their own seed/relation, with no built-in lean.
    </p>
    <ul class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-dimmed sm:grid-cols-4">
      <li
        v-for="entry in entries"
        :key="entry.role"
      >
        <span class="font-medium text-muted">{{ entry.role }}</span>
        → {{ entry.hue }}° ({{ entry.familyName }})
      </li>
    </ul>
  </InfoPanel>
</template>
