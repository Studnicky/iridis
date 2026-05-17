<script setup lang="ts">
/**
 * BuildConfigFieldPanel.vue
 *
 * One config field rendered as an IridisCard + FormField + slotted
 * PrimeVue control. Used by BuildPanel's flat tab row so each engine
 * knob (framing / contrast / algorithm / colour space / schema) has
 * an identical shape without per-tab template repetition.
 *
 * The component is dumb: it does not know what the control is or
 * what it writes to. The consumer slots in `<SelectButton>`,
 * `<Select>`, `<Slider>`, etc.
 */
import IridisCard from './base/IridisCard.vue';
import FormField  from './FormField.vue';

defineProps<{
  'leg':     string;
  'tooltip': string;
}>();
</script>

<template>
  <IridisCard variant="inset" class="build-config-field-panel">
    <FormField :leg="leg" :tooltip="tooltip" orientation="column">
      <slot />
    </FormField>
  </IridisCard>
</template>

<style scoped>
.build-config-field-panel {
  width: 100%;
}
</style>
