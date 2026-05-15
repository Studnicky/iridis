<script setup lang="ts">
/**
 * PaletteEditor.vue
 *
 * Reusable palette grid editor. Renders a header row ("Palette (N)" +
 * "click to edit" hint) and a wrap-flex grid of `<PaletteSwatch>`
 * buttons, optionally preceded by a "+ add" button.
 *
 * Presentational only — never touches the theme store. Every mutation
 * bubbles up through typed emits so the parent (currently IridisDemo)
 * stays the single owner of palette state and dispatch.
 */

import Button from 'primevue/button';
import PaletteSwatch from './PaletteSwatch.vue';

defineProps<{
  'colors':        readonly string[];
  'selectedIndex': number;
  'allowAdd':      boolean;
  'canAdd':        boolean;
  'canRemove':     boolean;
}>();

const emit = defineEmits<{
  'select': [index: number];
  'add':    [];
  'remove': [index: number];
}>();
</script>

<template>
  <div class="palette-editor">
    <div class="palette-editor__header">
      <span
        class="palette-editor__label"
        title="The seeds you feed the engine. Each swatch is one input color the resolver tries to match into the role schema below."
      >Palette ({{ colors.length }})</span>
      <span
        class="palette-editor__hint"
        title="Click any swatch to load that color into the picker on the right and edit it in place."
      >click to edit</span>
    </div>
    <div class="palette-editor__grid">
      <Button
        v-if="allowAdd"
        type="button"
        label="+ add"
        size="small"
        :disabled="!canAdd"
        :aria-label="canAdd ? 'Add color to palette' : 'Palette full'"
        class="palette-editor__add"
        :title="canAdd ? 'Append a new color to the palette. The engine re-resolves immediately.' : 'Palette is at its maxItems cap.'"
        @click="emit('add')"
      />
      <PaletteSwatch
        v-for="(color, idx) in colors"
        :key="idx"
        :color="color"
        :index="idx"
        :selected="selectedIndex === idx"
        :removable="canRemove"
        @select="emit('select', idx)"
        @remove="emit('remove', idx)"
      />
    </div>
  </div>
</template>

<style scoped>
.palette-editor {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.palette-editor__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.55rem;
}
.palette-editor__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.palette-editor__hint {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  font-style: italic;
}

.palette-editor__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-content: flex-start;
}

.palette-editor__add {
  align-self: flex-start;
}
.palette-editor__add :deep(.p-button) {
  background:    color-mix(in oklch, var(--iridis-brand) 20%, var(--vp-c-bg));
  border:        var(--iridis-border-soft);
  border-color:  color-mix(in oklch, var(--iridis-brand) 40%, var(--iridis-divider));
  border-radius: var(--iridis-radius-sm);
  color:         var(--iridis-on-brand);
  box-shadow:    var(--iridis-shadow-felt);
  font-weight:   600;
  font-size:     0.78rem;
  padding:       0.45rem 0.85rem;
}
.palette-editor__add :deep(.p-button:hover:not(:disabled)) {
  background:   color-mix(in oklch, var(--iridis-brand) 35%, var(--vp-c-bg));
  border-color: var(--iridis-brand);
  box-shadow:   var(--iridis-shadow-felt-hover);
}
</style>
