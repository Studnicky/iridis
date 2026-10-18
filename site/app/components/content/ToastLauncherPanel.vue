<script setup lang="ts">
import { useToast } from '#imports';

import { AliasColorEntity } from '~/theme/entities/AliasColorEntity.ts';
import { capitalize } from '~/utils/capitalize.ts';

const toast = useToast();
const colors = AliasColorEntity.Values;
function fireToast(color: AliasColorEntity.Type): void {
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
