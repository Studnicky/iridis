<script setup lang="ts">
import { computed } from 'vue';
import { buildPickerSeedGridModel } from './picker/buildPickerSeedGridModel.ts';

const props = defineProps<{
  pickerSeeds: readonly { hex: string }[];
  canAdd: boolean;
  canRemove: boolean;
}>();

const emit = defineEmits<{
  add: [];
  remove: [index: number];
  'commit-hex': [index: number, event: Event];
  'pick-color': [index: number, hex: string];
}>();

const seedCardItems = computed(() => buildPickerSeedGridModel(props.pickerSeeds));
</script>

<template>
  <div class="rounded-lg border-2 border-dashed border-default p-4 space-y-3">
    <UButton
      icon="i-material-symbols-add-rounded"
      color="primary"
      variant="soft"
      size="sm"
      :disabled="!canAdd"
      @click="emit('add')"
    >
      Add hue
    </UButton>

    <BalancedWrap
      v-auto-animate
      :items="[...seedCardItems]"
      :min-width="150"
      :gap="12"
    >
      <template #default="{ item: card, index: i }">
        <PickerSeedEditorCard
          :hex="card.hex"
          :index="i"
          :can-remove="canRemove"
          @remove="emit('remove', i)"
          @commit-hex="emit('commit-hex', i, $event)"
          @pick-color="emit('pick-color', i, $event)"
        />
      </template>
    </BalancedWrap>
  </div>
</template>
