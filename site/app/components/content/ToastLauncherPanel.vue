<script setup lang="ts">
import { ALIAS_COLOR_NAMES } from '~/theme/aliasColorNames.ts';
import type { AliasColorType } from '~/theme/types/aliasColor.ts';
import { capitalize } from '~/utils/capitalize.ts';

const toast = useToast();
const colors = ALIAS_COLOR_NAMES;
type ColorType = AliasColorType;

function fireToast(color: ColorType): void {
  toast.add({
    'color': color,
    'description': `A live UToast in the ${color} color — engine-themed, not a mockup.`,
    'icon': 'i-material-symbols-notifications-rounded',
    'title': `${capitalize(color)} toast`
  });
}
</script>

<template>
  <InfoPanel
    variant="default"
    label="Click to fire a real UToast"
  >
    <BalancedWrap
      :items="[...colors]"
      :min-width="80"
      :gap="8"
    >
      <template #default="{ item: color }">
        <UButton
          :color="color"
          class="flex-1 justify-center"
          @click="fireToast(color)"
        >
          {{ color }}
        </UButton>
      </template>
    </BalancedWrap>
  </InfoPanel>
</template>
