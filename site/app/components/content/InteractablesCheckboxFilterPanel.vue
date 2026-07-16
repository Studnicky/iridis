<script setup lang="ts">
import { ALIAS_COLOR_NAMES } from '~/theme/aliasColorNames.ts';
import type { AliasColorType } from '~/theme/types/aliasColor.ts';

const model = defineModel<AliasColorType[]>({ required: true });
const colors = ALIAS_COLOR_NAMES;
</script>

<template>
  <InfoPanel
    variant="default"
    label="Checkbox group — filters the avatars/badges card"
    class="space-y-2"
  >
    <UCheckboxGroup
      v-model="model"
      :items="[...colors]"
      orientation="horizontal"
      size="sm"
      :ui="{ fieldset: 'flex flex-wrap gap-x-4 gap-y-2' }"
    />
  </InfoPanel>
</template>
