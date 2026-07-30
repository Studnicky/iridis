<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { useModeGuardedSend } from '~/composables/useModeGuardedSend.ts';
import { buildPickerSeedModel } from './picker/buildPickerSeedModel.ts';

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
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }
  const input = event.target;
  const result = buildPickerSeedModel.buildHexCommitResult(input.value, pickerSeeds.value[index]?.hex ?? '');
  if (result.acceptedHex !== null) {
    sendPickerAction({ hex: result.acceptedHex, index, type: IridisUiActionType.SET_SEED });
    return;
  }
  input.value = result.inputValue;
}

function removeSeed(index: number): void {
  sendPickerAction({ index, 'type': IridisUiActionType.REMOVE_SEED });
}

function setSeedColor(index: number, hex: string): void {
  sendPickerAction({ hex, index, 'type': IridisUiActionType.SET_SEED });
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
      @remove="removeSeed"
      @commit-hex="commitHexText"
      @pick-color="setSeedColor"
    />
  </div>
</template>
