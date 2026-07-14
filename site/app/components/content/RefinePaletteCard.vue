<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { IridisUiActionType } from '~/composables/types/index.ts';

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

/** Group order for the role picker: surfaces, text, borders, brand/semantic, then syntax tokens. */
const ROLE_GROUP_ORDER = [
  'background', 'bg-soft', 'surface', 'code-bg', 'divider',
  'text', 'text-strong', 'text-subtle',
  'border', 'border-strong',
  'brand', 'on-brand', 'accent-alt', 'muted',
  'success', 'warning', 'error', 'info',
  'syntax-keyword', 'syntax-string', 'syntax-number', 'syntax-function', 'syntax-type',
  'syntax-comment', 'syntax-attribute', 'syntax-punctuation'
];
const sortedPinnableRoles = computed(() => {
  return [...pinnableRoles.value].sort((a, b) => {
    const ai = ROLE_GROUP_ORDER.indexOf(a);
    const bi = ROLE_GROUP_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
});

function pinRole(index: number, role: string | undefined): void {
  send({ index: index, role: role, type: IridisUiActionType.PIN_SEED_ROLE });
}
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-muted">
      {{ mode === 'image' ? "The Intake stage's Combine result — assign each hue a role below." : "The Intake stage's picker seeds — assign each hue a role below." }}
    </p>

    <BalancedWrap
      v-auto-animate
      :items="activeSeeds"
      :min-width="210"
      :gap="12"
    >
      <template #default="{ item: card, index: i }">
        <div class="relative flex flex-col gap-2 rounded-lg border border-default bg-elevated/50 p-2.5 flex-1 max-w-xs">
          <div class="flex items-center gap-2">
            <span
              class="h-10 w-10 flex-none rounded-md border border-default"
              :style="{ backgroundColor: card.hex }"
              :title="card.hex"
              role="img"
              :aria-label="`Seed color ${card.hex}`"
            />
            <div class="flex flex-col min-w-0 flex-1">
              <span class="font-mono text-xs text-muted truncate">{{ card.hex }}</span>
            </div>
          </div>
          <UPopover
            mode="hover"
            :content="{ align: 'start' }"
          >
            <UButton
              :label="card.role ?? 'Unpinned'"
              trailing-icon="i-material-symbols-keyboard-arrow-down-rounded"
              size="xs"
              :color="card.role ? 'primary' : 'neutral'"
              variant="soft"
              class="w-full justify-between rounded-full"
            />
            <template #content>
              <div class="flex max-h-64 max-w-56 flex-wrap gap-1 overflow-y-auto p-2">
                <UButton
                  label="Unpinned"
                  size="xs"
                  :color="card.role ? 'neutral' : 'primary'"
                  :variant="card.role ? 'soft' : 'solid'"
                  class="rounded-full"
                  @click="pinRole(i, undefined)"
                />
                <UButton
                  v-for="r in sortedPinnableRoles"
                  :key="r"
                  :label="r"
                  size="xs"
                  :color="card.role === r ? 'primary' : (activeSeeds.some((s, sIdx) => sIdx !== i && s.role === r) ? 'warning' : 'neutral')"
                  :variant="card.role === r ? 'solid' : 'soft'"
                  class="rounded-full"
                  @click="pinRole(i, card.role === r ? undefined : r)"
                />
              </div>
            </template>
          </UPopover>
        </div>
      </template>
    </BalancedWrap>
  </div>
</template>
