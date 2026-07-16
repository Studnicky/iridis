<script setup lang="ts">
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';
import { computed } from 'vue';
import { buildRoleMathPinnedDetailsModel } from './roleMath/buildRoleMathPinnedDetailsModel.ts';

const props = defineProps<{
  role: RoleMathEntryType;
}>();

const pinnedDetailsModel = computed(() => buildRoleMathPinnedDetailsModel(props.role));
</script>

<template>
  <div v-if="props.role.isPinned">
    <StatusNote class="space-y-1">
      <div>This role was explicitly pinned by the user, so distance-matching against candidate seeds was skipped entirely.</div>
    </StatusNote>
    <SwatchInfoCard
      v-if="pinnedDetailsModel"
      class="mt-1 not-italic"
      :hex="pinnedDetailsModel.hex"
      :label="pinnedDetailsModel.label"
      :aria-label="pinnedDetailsModel.ariaLabel"
      swatch-class="h-5 w-5 rounded shadow-inner flex-none border border-default"
    >
      <template #title>
        <MonoValue>{{ pinnedDetailsModel.hex }}</MonoValue>
      </template>
      <span class="text-dimmed">{{ pinnedDetailsModel.bodyText }}</span>
    </SwatchInfoCard>
  </div>
</template>
