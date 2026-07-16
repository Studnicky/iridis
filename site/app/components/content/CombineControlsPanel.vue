<script setup lang="ts">
import type { GalleryAlgorithmType } from '@studnicky/iridis-image/types';

defineProps<{
  running: boolean;
  combineLocked: boolean;
  schemaName: string;
  algorithm: GalleryAlgorithmType;
  deltaECap: number;
  histogramBits: number;
  harmonizeThreshold: number;
  lightnessRange: readonly [number, number][];
  chromaRange: readonly [number, number][];
  deltaECapHelp: string;
  histogramHelp: string;
  harmonizeHelp: string;
  lightnessHelp: string;
  chromaHelp: string;
}>();

const emit = defineEmits<{
  rerun: [];
  'update:combineLocked': [value: boolean];
  'update:schemaName': [value: string];
  'update:algorithm': [value: GalleryAlgorithmType];
  'update:deltaECap': [value: number];
  'update:histogramBits': [value: number];
  'update:harmonizeThreshold': [value: number];
  'update:lightnessRange': [value: [number, number][]];
  'update:chromaRange': [value: [number, number][]];
}>();
</script>

<template>
  <div class="space-y-4 mt-4">
    <ControlStrip
      title="Combine lock"
      description="Lock to keep this palette while uploading more images — click Re-run when you're ready to recombine."
      class="rounded-lg"
    >
      <USwitch
        :model-value="combineLocked"
        :icon="combineLocked ? 'i-material-symbols-lock-outline-rounded' : 'i-material-symbols-lock-open-outline-rounded'"
        label="Lock"
        :aria-label="combineLocked ? 'Combine locked' : 'Combine unlocked'"
        @update:model-value="emit('update:combineLocked', $event)"
      />
      <UButton
        icon="i-material-symbols-refresh-rounded"
        color="primary"
        variant="soft"
        size="sm"
        @click="emit('rerun')"
      >
        Re-run
      </UButton>
    </ControlStrip>

    <div class="space-y-4 my-6 relative">
      <div
        v-if="running"
        class="absolute inset-0 z-10 flex items-center justify-center bg-elevated/50 backdrop-blur-sm rounded-lg"
      >
        <UIcon
          name="i-material-symbols-progress-activity"
          class="size-8 animate-spin text-primary"
        />
      </div>

      <Histogram />
    </div>

    <UFormField
      :label="`Colors — role schema · ${schemaName}`"
      class="rounded-lg border border-default p-4"
    >
      <SchemaSelector
        :model-value="schemaName"
        @update:model-value="emit('update:schemaName', $event)"
      />
      <FieldHelpText>
        How many dominant colors to extract from the image — the same "how many roles to resolve" setting as Schema &amp; Compliance in the Refine stage, not a second independent count. Change it here or there; both move together.
      </FieldHelpText>
    </UFormField>

    <AdvancedMergeSettings
      :algorithm="algorithm"
      :delta-e-cap="deltaECap"
      :histogram-bits="histogramBits"
      :harmonize-threshold="harmonizeThreshold"
      :lightness-range="lightnessRange"
      :chroma-range="chromaRange"
      :delta-e-cap-help="deltaECapHelp"
      :histogram-help="histogramHelp"
      :harmonize-help="harmonizeHelp"
      :lightness-help="lightnessHelp"
      :chroma-help="chromaHelp"
      @update:algorithm="emit('update:algorithm', $event)"
      @update:delta-e-cap="emit('update:deltaECap', $event)"
      @update:histogram-bits="emit('update:histogramBits', $event)"
      @update:harmonize-threshold="emit('update:harmonizeThreshold', $event)"
      @update:lightness-range="emit('update:lightnessRange', $event)"
      @update:chroma-range="emit('update:chromaRange', $event)"
    />
  </div>
</template>
