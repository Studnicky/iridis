<script setup lang="ts">
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';
import type { HueAlgorithmType } from '~/composables/types/colorDerivation.ts';
import { capitalize } from '~/utils/capitalize.ts';
import { hueVariantLabel } from '~/utils/hueVariantLabel.ts';

defineProps<{
  group: {
    readonly parentName: string;
    readonly parentHex: string;
    readonly children: readonly RoleMathEntryType[];
  };
  bulkAlgorithm: HueAlgorithmType.Type;
  algorithmOptions: readonly { label: string; value: HueAlgorithmType.Type }[];
  variantOptions: (algorithm: HueAlgorithmType.Type) => readonly { label: string; value: number }[];
}>();

const emit = defineEmits<{
  'apply-all': [];
  'bulk-algorithm-change': [algorithm: HueAlgorithmType.Type];
  'algorithm-change': [role: RoleMathEntryType, algorithm: HueAlgorithmType.Type];
  'variant-change': [role: RoleMathEntryType, hueVariantIndex: number];
  'freeform-offset-change': [role: RoleMathEntryType, offsetDeg: number];
}>();

function updateBulkAlgorithm(algorithm: HueAlgorithmType.Type): void {
  emit('bulk-algorithm-change', algorithm);
}
</script>

<template>
  <InfoPanel
    variant="default"
    class="space-y-3 border-default/50"
    :label="capitalize(group.parentName)"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span
          class="inline-block h-3 w-3 rounded-full ring-1 ring-default/50"
          :style="{ background: group.parentHex }"
        />
        <span class="text-xs text-dimmed">{{ group.children.length }} derived role{{ group.children.length === 1 ? '' : 's' }}</span>
      </div>
      <div class="flex items-center gap-2">
        <AppSelect
          :model-value="bulkAlgorithm"
          :items="algorithmOptions"
          size="xs"
          class="w-40"
          @update:model-value="updateBulkAlgorithm"
        />
        <UButton
          size="xs"
          variant="soft"
          :disabled="bulkAlgorithm === 'freeform'"
          @click="$emit('apply-all')"
        >
          Apply to all
        </UButton>
      </div>
    </div>

    <div class="space-y-2">
      <DerivationRoleRow
        v-for="role in group.children"
        :key="role.name"
        :role="role"
        :algorithm-options="algorithmOptions"
        :variant-items="role.algorithmInfo ? variantOptions(role.algorithmInfo.hueAlgorithm) : []"
        :variant-label="role.algorithmInfo ? hueVariantLabel(role.algorithmInfo.offsetDeg) : ''"
        @algorithm-change="$emit('algorithm-change', role, $event)"
        @variant-change="$emit('variant-change', role, $event)"
        @freeform-offset-change="$emit('freeform-offset-change', role, $event)"
      />
    </div>
  </InfoPanel>
</template>
