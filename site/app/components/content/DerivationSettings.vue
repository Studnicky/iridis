<script setup lang="ts">
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { IridisUiActionType } from '~/composables/types/index.ts';
import type { DerivationConfig, HueAlgorithm, RoleType } from '~/composables/types/colorDerivation.ts';
import { PRESET_DEFAULTS } from '~/composables/types/colorDerivation.ts';

const { derivationConfig } = useIridis();
const { send } = useIridisUiMachine();

const hueAlgorithmOptions = [
  { label: 'Monochromatic', value: 'monochromatic' as HueAlgorithm },
  { label: 'Complementary', value: 'complementary' as HueAlgorithm },
  { label: 'Analogous', value: 'analogous' as HueAlgorithm },
  { label: 'Triadic', value: 'triadic' as HueAlgorithm },
  { label: 'Tetradic', value: 'tetradic' as HueAlgorithm },
  { label: 'Split-complementary', value: 'split-complementary' as HueAlgorithm },
  { label: 'Compound', value: 'compound' as HueAlgorithm },
  { label: 'Freeform', value: 'freeform' as HueAlgorithm }
];

const roles: RoleType[] = ['primary', 'success', 'warning', 'error', 'info', 'neutral', 'accent'];

function getRoleAlgorithm(role: RoleType): HueAlgorithm {
  const val = derivationConfig.value;
  return val?.roles?.[role]?.hueAlgorithm || 'monochromatic';
}

function updateAlgorithm(role: RoleType, algorithm: HueAlgorithm): void {
  const current = derivationConfig.value || PRESET_DEFAULTS.automatic;
  if (!current?.roles) {return;}
  const currentRole = current.roles[role];
  const updated: DerivationConfig = {
    ...current,
    strategy: 'custom',
    roles: {
      ...current.roles,
      [role]: {
        ...(currentRole || { hueAlgorithm: 'monochromatic', variationAlgorithms: [] }),
        hueAlgorithm: algorithm
      }
    }
  };
  send({ config: updated, 'type': IridisUiActionType.SET_DERIVATION_CONFIG });
}

function formatLabel(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).replace('-', ' ');
}
</script>

<template>
  <div class="space-y-3">
    <div class="text-sm font-semibold text-highlighted">Derivation Algorithms</div>
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div v-for="role in roles" :key="role" class="space-y-1.5">
        <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400">{{ formatLabel(role) }}</label>
        <USelect
          :model-value="getRoleAlgorithm(role)"
          :items="hueAlgorithmOptions"
          value-key="value"
          @update:model-value="updateAlgorithm(role, $event)"
          size="sm"
          class="w-full"
        />
      </div>
    </div>
  </div>
</template>
