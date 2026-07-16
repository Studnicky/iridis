<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { useModeGuardedSend } from '~/composables/useModeGuardedSend.ts';
import { buildPickerSeedHexCommitResult } from './picker/buildPickerSeedModel.ts';

/**
 * The Refine stage's "Palette" card — seed-color entry, the first card in
 * Refine. Add/remove hues and set their hex directly, either as the
 * alternative to uploading an image (reached via the Upload stage's "Skip"
 * button) or as a follow-up refinement after one. Role assignment for these
 * same seeds happens next, in this stage's "Palette" card
 * (RefinePaletteCard.vue) — this card is only about WHICH colors feed the
 * engine, not what role each plays.
 */
const { pickerSeeds, mode } = useIridis();
const { send } = useIridisUiMachine();

/** Palette hue edits imply the engine should theme from picker seeds, not an extracted image. */
const sendPickerAction = useModeGuardedSend(mode, send, 'picker');

/**
 * The hex text next to the swatch used to be a plain read-only label — the
 * only way to actually change a seed was the native `<input type="color">`
 * swatch's own OS picker, with no way to type or paste an exact hex value.
 * Committing an edit re-validates against the same 6-digit `#rrggbb` check
 * every engine-output filter uses; an invalid value is dropped (the input
 * snaps back to the last valid hex on its own next render) rather than ever
 * reaching SET_SEED with a malformed hex.
 */
function commitHexText(index: number, event: Event): void {
  const input = event.target as HTMLInputElement;
  const result = buildPickerSeedHexCommitResult(input.value, pickerSeeds.value[index]?.hex ?? '');
  if (result.acceptedHex !== null) {
    sendPickerAction({ hex: result.acceptedHex, index, type: IridisUiActionType.SET_SEED });
    return;
  }
  input.value = result.inputValue;
}
</script>

<template>
  <div class="space-y-3">
    <SectionIntro :body="mode === 'picker' ? 'Seed colors entered here feed the engine directly.' : 'Add or edit a hue below to switch the engine over to these palette seeds instead of an extracted image.'" />

    <PickerSeedGrid
      :picker-seeds="pickerSeeds"
      :can-add="pickerSeeds.length < 32"
      :can-remove="pickerSeeds.length > 1"
      @add="sendPickerAction({ 'hex': undefined, 'type': IridisUiActionType.ADD_SEED })"
      @remove="(index) => sendPickerAction({ type: IridisUiActionType.REMOVE_SEED, index })"
      @commit-hex="commitHexText"
      @pick-color="(index, hex) => sendPickerAction({ type: IridisUiActionType.SET_SEED, index, hex })"
    />
  </div>
</template>
