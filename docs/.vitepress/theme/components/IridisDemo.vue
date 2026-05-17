<script setup lang="ts">
/**
 * IridisDemo.vue — split-column palette editor + OKLCH picker.
 *
 * Parallel layout to ImageToTheme so the User-palette ↔ Image tab
 * swap reads as a content change, not a layout shift. Left column
 * is the "source" (palette swatches), right column is the "controls"
 * (OKLCH picker for the selected swatch).
 *
 * Reads and mutates `configStore.paletteColors`.
 */
import { computed, ref } from 'vue';

import IridisPicker  from './IridisPicker.vue';
import PaletteEditor from './PaletteEditor.vue';
import { configStore } from '../stores/configStore.ts';

const props = withDefaults(defineProps<{
  'pipeline'?:  readonly string[];
  'allowAdd'?:  boolean;
  'minColors'?: number;
  'maxColors'?: number;
}>(), {
  'pipeline':  () => [],
  'allowAdd':  true,
  'minColors': 1,
  'maxColors': 8,
});
void props.pipeline;

const selectedSwatch = ref<number>(0);

function setColor(idx: number, value: string): void {
  const next = [...configStore.paletteColors];
  next[idx] = value;
  configStore.paletteColors = next;
}
function addColor(): void {
  if (configStore.paletteColors.length >= props.maxColors) return;
  configStore.paletteColors = [...configStore.paletteColors, '#888888'];
  selectedSwatch.value = configStore.paletteColors.length - 1;
}
function removeColor(idx: number): void {
  if (configStore.paletteColors.length <= props.minColors) return;
  const next = [...configStore.paletteColors];
  next.splice(idx, 1);
  configStore.paletteColors = next;
  if (selectedSwatch.value >= configStore.paletteColors.length) {
    selectedSwatch.value = Math.max(0, configStore.paletteColors.length - 1);
  }
}
function selectSwatch(idx: number): void {
  selectedSwatch.value = idx;
}
function onPickerUpdate(value: string): void {
  setColor(selectedSwatch.value, value);
}

const canAdd      = computed(() => props.allowAdd && configStore.paletteColors.length < props.maxColors);
const canRemove   = computed(() => configStore.paletteColors.length > props.minColors);
const selectedHex = computed(() => configStore.paletteColors[selectedSwatch.value] ?? '#888888');
</script>

<template>
  <ClientOnly>
    <section class="iridis-demo">
      <div class="iridis-demo__grid">
        <!-- LEFT — Color picker. Same slot as the image drop zone in
             the Image tab: the single visual editor for the active
             input. -->
        <div class="iridis-demo__col iridis-demo__col--source">
          <div class="iridis-demo__col-head">
            <span class="iridis-demo__label">Color</span>
            <span class="iridis-demo__hint">editing color {{ selectedSwatch + 1 }}</span>
          </div>
          <IridisPicker :model-value="selectedHex" @update:model-value="onPickerUpdate" />
        </div>

        <!-- RIGHT — Palette swatches. Same slot as the histogram +
             extraction sliders in the Image tab: the multi-cluster
             output view. Click a swatch to load it into the picker. -->
        <div class="iridis-demo__col iridis-demo__col--output">
          <div class="iridis-demo__col-head">
            <span class="iridis-demo__label">Palette</span>
            <span class="iridis-demo__hint">{{ configStore.paletteColors.length }} of {{ maxColors }} seeds</span>
          </div>
          <PaletteEditor
            :colors="configStore.paletteColors"
            :selected-index="selectedSwatch"
            :allow-add="allowAdd"
            :can-add="canAdd"
            :can-remove="canRemove"
            @select="selectSwatch"
            @add="addColor"
            @remove="removeColor"
          />
        </div>
      </div>
    </section>
  </ClientOnly>
</template>

<style scoped>
.iridis-demo {
  container-type: inline-size;
  container-name: demo;
}
.iridis-demo__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}
@container demo (min-width: 720px) {
  .iridis-demo__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
.iridis-demo__col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}
.iridis-demo__col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 1.75rem;
}
.iridis-demo__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.iridis-demo__hint {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}
</style>
