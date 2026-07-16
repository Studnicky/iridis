<script setup lang="ts">
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';
import { describeHueAlgorithm } from './derivation/describeHueAlgorithm.ts';

defineProps<{
  role: RoleMathEntryType;
  isOpen: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();
</script>

<template>
  <div class="flex flex-col rounded-lg border border-default bg-elevated text-sm overflow-hidden break-inside-avoid mb-3">
    <button
      type="button"
      class="flex items-center justify-between gap-2 p-3 text-left"
      :data-state="isOpen ? 'open' : 'closed'"
      @click="emit('toggle')"
    >
      <div class="flex items-center gap-2 min-w-0">
        <div class="text-sm font-semibold text-highlighted truncate">
          {{ role.name }}
        </div>
        <div
          class="h-4 w-4 rounded shadow-inner flex-none border border-default"
          :style="{ backgroundColor: role.hex }"
          :title="role.hex"
        />
        <RoleMathStatusBadge :role="role" />
      </div>
      <UIcon
        name="i-lucide-chevron-down"
        class="ml-auto size-4 flex-none transition-transform data-[state=open]:rotate-180"
        :data-state="isOpen ? 'open' : 'closed'"
      />
    </button>

    <div
      v-if="isOpen"
    >
      <RoleMathDetailsPanel
        :role="role"
        :algorithm-label="describeHueAlgorithm(role.algorithmInfo?.hueAlgorithm)"
      />
    </div>
  </div>
</template>
