<script setup lang="ts">
import { SCHEMA_SELECTOR_ITEMS } from './schema/schemaSelectorItems.ts';

/**
 * Role-schema picker: a pill row + mirrored slider, both selecting from the
 * same fixed tier list. Used by both the Combine stage (image extraction's
 * color count) and Schema & Compliance (the role-count schema) — they read
 * and write the SAME `schemaName` ref, this is genuinely one control shown
 * in two places, not two independent choices. The parent owns the FSM
 * dispatch (`send({type: SET_SCHEMA, ...})`); this component only knows the
 * pill/slider interaction.
 */
defineProps<{ 'modelValue': string }>();
const emit = defineEmits<{ 'update:modelValue': [schemaName: string] }>();
</script>

<template>
  <SegmentedSlider
    :items="SCHEMA_SELECTOR_ITEMS"
    :model-value="modelValue"
    :min-width="48"
    :gap="8"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
