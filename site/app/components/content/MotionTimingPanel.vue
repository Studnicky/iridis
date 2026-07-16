<script setup lang="ts">
defineProps<{
  reducedMotion: boolean;
  tuneMs: number;
  easeKey: string;
  easeOptions: readonly string[];
}>();

const emit = defineEmits<{
  'update:tuneMs': [value: number];
  'update:easeKey': [value: string];
}>();
</script>

<template>
  <div class="space-y-5">
    <UBadge
      v-if="reducedMotion"
      color="warning"
      variant="soft"
      class="mb-3"
    >
      prefers-reduced-motion is on
    </UBadge>

    <ControlPlane
      label="Timing"
      help="Drag the duration — every color transition on this page, not just the swatches below, runs on this same clock."
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField :label="`Unison duration · ${tuneMs}ms`">
          <USlider
            :model-value="tuneMs"
            :min="100"
            :max="1500"
            :step="50"
            @update:model-value="($event) => { if ($event !== undefined) emit('update:tuneMs', $event); }"
          />
        </UFormField>
        <UFormField label="Easing">
          <AppSelect
            :model-value="easeKey"
            :items="easeOptions"
            class="w-full"
            @update:model-value="emit('update:easeKey', $event)"
          />
        </UFormField>
      </div>
    </ControlPlane>
  </div>
</template>
