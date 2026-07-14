<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { useModeGuardedSend } from '~/composables/useModeGuardedSend.ts';

/**
 * The Refine stage's "Manual" card — manual seed-color entry, the first card
 * in Refine. Add/remove hues and set their hex directly, either as the
 * alternative to uploading an image (reached via the Upload stage's "Skip"
 * button) or as a follow-up refinement after one. Role assignment for these
 * same seeds happens next, in this stage's "Palette" card
 * (RefinePaletteCard.vue) — this card is only about WHICH colors feed the
 * engine, not what role each plays.
 */
const { pickerSeeds, mode } = useIridis();
const { send } = useIridisUiMachine();

/** Manual hue edits imply the engine should theme from picker seeds, not an extracted image. */
const sendPickerAction = useModeGuardedSend(mode, send, 'picker');

type SeedCardItemType = { hex: string };
const seedCardItems = computed<SeedCardItemType[]>(() => {
  return pickerSeeds.value.map((s) => {return { hex: s.hex };});
});
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-muted">
      {{ mode === 'picker' ? 'Seed colors entered here feed the engine directly.' : 'Add or edit a hue below to switch the engine over to these manually-entered seeds instead of an extracted image.' }}
    </p>

    <div class="rounded-lg border-2 border-dashed border-default p-4 space-y-3">
      <UButton
        icon="i-material-symbols-add-rounded"
        color="primary"
        variant="soft"
        size="sm"
        :disabled="pickerSeeds.length >= 32"
        @click="sendPickerAction({ type: IridisUiActionType.ADD_SEED })"
      >
        Add hue
      </UButton>

      <BalancedWrap
        v-auto-animate
        :items="seedCardItems"
        :min-width="150"
        :gap="12"
      >
        <template #default="{ item: card, index: i }">
          <div class="relative flex items-center gap-2 rounded-lg border border-default bg-elevated/50 p-2.5 flex-1 max-w-52">
            <UButton
              icon="i-material-symbols-close-rounded"
              color="error"
              variant="ghost"
              size="xs"
              class="absolute top-1 right-1 p-0.5"
              :disabled="pickerSeeds.length <= 1"
              :aria-label="`Remove seed ${i}`"
              @click="sendPickerAction({ type: IridisUiActionType.REMOVE_SEED, index: i })"
            />
            <input
              :value="card.hex"
              type="color"
              class="h-10 w-10 cursor-pointer rounded-md border-0 bg-transparent flex-none"
              @change="sendPickerAction({ type: IridisUiActionType.SET_SEED, index: i, hex: ($event.target as HTMLInputElement).value })"
            >
            <span class="font-mono text-xs text-muted truncate">{{ card.hex }}</span>
          </div>
        </template>
      </BalancedWrap>
    </div>
  </div>
</template>
