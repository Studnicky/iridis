<script setup lang="ts">
/**
 * PaletteSwatch.vue
 *
 * Reusable swatch button for a single palette color. Renders a PrimeVue
 * Button containing a color chip, the hex code, and an optional remove
 * overlay. Selection state drives the severity binding (primary when
 * selected, secondary+outlined otherwise) so the swatch reads as a
 * pressed toggle in the picker grid.
 *
 * The remove overlay stops propagation so clicking × does not also
 * trigger select. This component is purely presentational; the parent
 * owns the palette and dispatches mutations through its store.
 */

import Button from 'primevue/button';

defineProps<{
  'color':     string;
  'index':     number;
  'selected':  boolean;
  'removable': boolean;
}>();

const emit = defineEmits<{
  'select': [];
  'remove': [];
}>();
</script>

<template>
  <Button
    :severity="selected ? 'primary' : 'secondary'"
    :variant="selected ? undefined : 'outlined'"
    size="small"
    :class="['palette-swatch', { 'palette-swatch--selected': selected }]"
    :aria-label="`select palette color ${index + 1} (${color})`"
    :aria-pressed="selected"
    :title="`Palette color ${index + 1} (${color}). Click to load it into the picker on the right.`"
    @click="emit('select')"
  >
    <span class="palette-swatch__chip" :style="{ background: color }" />
    <code class="palette-swatch__hex">{{ color }}</code>
    <span
      v-if="removable"
      class="palette-swatch__remove"
      :aria-label="`remove palette color ${index + 1}`"
      title="Remove this color from the palette. The engine re-resolves with one fewer seed."
      @click.stop="emit('remove')"
    >×</span>
  </Button>
</template>

<style scoped>
.palette-swatch {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.55rem 0.3rem 0.3rem;
  background: var(--vp-c-bg);
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-sm);
  cursor: pointer;
  box-shadow: var(--iridis-shadow-felt);
  transition:
    background-color var(--iridis-transition),
    border-color     var(--iridis-transition),
    box-shadow       var(--iridis-transition),
    transform 120ms cubic-bezier(0.4, 0, 0.2, 1);
}
.palette-swatch:hover {
  border-color: var(--vp-c-text-2);
  box-shadow: var(--iridis-shadow-felt-hover);
  transform: translateY(-1px);
}
.palette-swatch--selected {
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--iridis-shadow-felt-hover), 0 0 0 1px var(--vp-c-brand-1);
}
.palette-swatch__chip {
  display: inline-block;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.2);
}
.palette-swatch__hex {
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  color: var(--vp-c-text-2);
}
.palette-swatch__remove {
  width: 1rem;
  height: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  color: var(--vp-c-text-3);
  border-radius: 2px;
  cursor: pointer;
}
.palette-swatch__remove:hover {
  background: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 15%, transparent);
  color: var(--iridis-error, var(--iridis-text, currentColor));
}
</style>
