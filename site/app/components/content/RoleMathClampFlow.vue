<script setup lang="ts">
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';
import { computed } from 'vue';
import { buildRoleMathClampFlowModel } from './roleMath/buildRoleMathClampFlowModel.ts';

const props = defineProps<{
  role: RoleMathEntryType;
}>();

const clampFlowModel = computed(() => buildRoleMathClampFlowModel(props.role));
</script>

<template>
  <div
    v-if="clampFlowModel"
    class="mt-2 pt-3 border-t border-default/50 space-y-2"
  >
    <PanelHeading
      title="Clamp applied"
      as="div"
    />
    <SwatchInfoCard
      :hex="clampFlowModel.seedCard.hex"
      :label="clampFlowModel.seedCard.label"
      :aria-label="clampFlowModel.seedCard.ariaLabel"
      swatch-class="h-6 w-6 rounded border border-default shadow-inner flex-none"
    >
      <template #title>
        <MonoValue>{{ clampFlowModel.seedCard.hex }}</MonoValue>
      </template>
      <MutedMono class="truncate text-[10px]">
        {{ clampFlowModel.seedCard.bodyText }}
      </MutedMono>
    </SwatchInfoCard>
    <div class="flex justify-start ml-2.5 text-muted">
      <UIcon
        name="i-material-symbols-arrow-downward-rounded"
        class="h-3 w-3"
      />
    </div>
    <SwatchInfoCard
      :hex="clampFlowModel.resolvedCard.hex"
      :label="clampFlowModel.resolvedCard.label"
      :aria-label="clampFlowModel.resolvedCard.ariaLabel"
      swatch-class="h-6 w-6 rounded border border-default shadow-inner flex-none"
    >
      <template #title>
        <MonoValue>{{ clampFlowModel.resolvedCard.hex }}</MonoValue>
      </template>
      <span class="text-[10px] text-primary truncate">{{ clampFlowModel.resolvedCard.bodyText }}</span>
    </SwatchInfoCard>
  </div>
</template>
