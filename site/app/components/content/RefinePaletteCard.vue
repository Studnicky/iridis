<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { IridisUiActionType } from '~/composables/types/index.ts';
import { sortPinnableRoles } from './refine/buildRefinePaletteModel.ts';

/**
 * The Refine stage's "Palette" card — reviews the current seed/hue list
 * (populated either from the Intake stage's Picker or its Upload/Combine
 * result, via `activeSeeds` — pickerSeeds in picker mode, the selected
 * candidate/extraction's hues in image mode; both are the same
 * `PickerSeedType[]` shape, so this card never needs to know which mode it's
 * in to read the data) and assigns each one a role. This is deliberately
 * mode-agnostic: role assignment must work whether the seeds came from
 * manual picking or image extraction, so it dispatches PIN_SEED_ROLE directly
 * rather than through a mode-switching wrapper — pinning a role here must
 * never silently flip the page out of image mode.
 *
 * "Pin to role" lets a seed claim any role this page actually renders
 * somewhere — a Nuxt UI alias (success/warning/info/etc.), a --ui-* CSS var,
 * or a syntax-* token color — including schema-derived roles that would
 * otherwise be hue-rotated from brand by ExpandFamily (pin:derivedRoles
 * overrides that; see PinDerivedRoles.ts). pinnableRoles is restricted to
 * USED_ROLE_NAMES so a pin can never silently do nothing.
 */
const { activeSeeds, pinnableRoles, mode } = useIridis();
const { send } = useIridisUiMachine();

const sortedPinnableRoles = computed(() => sortPinnableRoles(pinnableRoles.value));

function pinRole(index: number, role: string | undefined): void {
  send({ index: index, role: role, type: IridisUiActionType.PIN_SEED_ROLE });
}
</script>

<template>
  <div class="space-y-3">
    <SectionIntro :body="mode === 'image' ? `The Intake stage's Combine result — assign each hue a role below.` : `The Intake stage's picker seeds — assign each hue a role below.`" />

    <RefinePaletteSeedGrid
      :active-seeds="activeSeeds"
      :sorted-pinnable-roles="sortedPinnableRoles"
      @pin="pinRole"
    />
  </div>
</template>
