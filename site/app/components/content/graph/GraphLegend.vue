<script setup lang="ts">
/**
 * Shared bottom-left legend for any graph canvas, ported from Dagonizer's
 * graph-visualizer. Entry swatch shapes: 'solid' (filled square), 'dashed'
 * (outlined, dashed border), 'circle' (filled circle). An entry with
 * `active` defined is clickable and emits `toggle(key)`.
 */
export interface LegendEntry {
  readonly key: string;
  readonly swatch: 'solid' | 'dashed' | 'circle';
  readonly color: string;
  readonly label: string;
  readonly active: boolean | undefined;
}

export interface LegendTab {
  readonly key: string;
  readonly label: string;
  readonly entries: readonly LegendEntry[];
}

defineProps<{
  tabs: readonly LegendTab[];
}>();

const emit = defineEmits<{
  (event: 'toggle', key: string): void;
}>();

function isClickable(entry: LegendEntry): boolean {
  return entry.active !== undefined;
}
</script>

<template>
  <aside
    class="graph-legend"
    aria-label="Graph legend"
  >
    <template
      v-for="tab in tabs"
      :key="tab.key"
    >
      <span class="legend-title">{{ tab.label }}</span>
      <button
        v-for="entry in tab.entries"
        :key="entry.key"
        type="button"
        :class="[
          'legend-entry',
          { 'legend-entry--clickable': isClickable(entry) },
          { 'legend-entry--off': entry.active === false },
        ]"
        :aria-pressed="isClickable(entry) ? entry.active : undefined"
        :title="isClickable(entry) ? (entry.active ? `Hide ${entry.label}` : `Show ${entry.label}`) : entry.label"
        :disabled="!isClickable(entry)"
        @click="isClickable(entry) && emit('toggle', entry.key)"
      >
        <span
          class="legend-swatch"
          :class="`legend-swatch--${entry.swatch}`"
          :style="{
            background: entry.swatch === 'dashed' ? 'transparent' : entry.color,
            borderColor: entry.color,
            borderStyle: entry.swatch === 'dashed' ? 'dashed' : 'solid',
          }"
          aria-hidden="true"
        />
        <span class="legend-label">{{ entry.label }}</span>
      </button>
    </template>
  </aside>
</template>

<style scoped>
.graph-legend {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  background: color-mix(in oklch, var(--ui-bg) 70%, transparent);
  backdrop-filter: blur(4px);
  border: 1px solid color-mix(in oklch, var(--glow) 22%, transparent);
  border-radius: 4px;
  padding: 0.35rem 0.6rem;
  z-index: 4;
}

.legend-title {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ui-text-dimmed);
  text-align: left;
  margin-bottom: 0.1rem;
}

.legend-entry {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: none;
  padding: 0.08rem 0;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--ui-text-highlighted);
  cursor: default;
  text-align: left;
}

.legend-entry--clickable {
  cursor: pointer;
}

.legend-entry--clickable:hover {
  color: var(--ui-primary);
}

.legend-entry--off {
  opacity: 0.4;
}

.legend-swatch {
  width: 9px;
  height: 9px;
  flex: none;
  border-width: 1.5px;
}

.legend-swatch--solid {
  border-radius: 2px;
}

.legend-swatch--dashed {
  border-radius: 2px;
}

.legend-swatch--circle {
  border-radius: 9999px;
}

.legend-label {
  white-space: nowrap;
}
</style>
