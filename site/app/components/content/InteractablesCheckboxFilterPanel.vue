<script setup lang="ts">

import { AliasColorEntity } from '~/theme/entities/AliasColorEntity.ts';

const model = defineModel<AliasColorEntity.Type[]>({ required: true });
const colors = AliasColorEntity.Values;
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
