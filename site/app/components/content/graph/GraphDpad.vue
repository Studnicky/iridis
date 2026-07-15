<script setup lang="ts">
/**
 * Shared 3x3 D-pad navigation control for any graph canvas, ported from
 * Dagonizer's graph-visualizer (same control leadography's own graph stage
 * uses) — a pure presentational component with zero knowledge of the
 * underlying canvas; the parent wires each emit to whatever engine it uses
 * (cosmos.gl here, matching ColorGraph.vue's usage below).
 *
 * Layout (row-major, 3 cols x 3 rows):
 *   [zoom-in ] [pan-up  ] [zoom-out]
 *   [pan-left] [centre  ] [pan-right]
 *   [expand  ] [pan-down] [fit     ]
 */
withDefaults(defineProps<{
  zoomLevel?: number;
  panEnabled?: boolean;
  /** Tooltip for the expand button. Consumers wire `@expand` to whatever the label implies (a zoom step, a fullscreen toggle, etc.). */
  expandTitle?: string;
}>(), {
  zoomLevel: undefined,
  panEnabled: true,
  expandTitle: 'Expand zoom',
});

const emit = defineEmits<{
  (event: 'zoom-in'):   void;
  (event: 'zoom-out'):  void;
  (event: 'pan-up'):    void;
  (event: 'pan-down'):  void;
  (event: 'pan-left'):  void;
  (event: 'pan-right'): void;
  (event: 'centre'):    void;
  (event: 'expand'):    void;
  (event: 'fit'):       void;
}>();
</script>

<template>
  <div
    class="graph-dpad-wrap"
    aria-label="Graph navigation controls"
  >
    <aside
      v-if="zoomLevel !== undefined"
      class="graph-zoom-hud"
      aria-live="polite"
    >
      <span class="graph-zoom-level">{{ zoomLevel.toFixed(2) }}×</span>
      <span class="graph-zoom-hint">drag · wheel</span>
    </aside>

    <div
      class="graph-dpad"
      aria-label="Navigation D-pad"
    >
      <button
        class="dpad-btn"
        title="Zoom in"
        @click="emit('zoom-in')"
      >
        ＋
      </button>
      <button
        class="dpad-btn"
        :class="{ 'dpad-btn--disabled': !panEnabled }"
        :disabled="!panEnabled"
        title="Pan up"
        @click="panEnabled && emit('pan-up')"
      >
        ▲
      </button>
      <button
        class="dpad-btn"
        title="Zoom out"
        @click="emit('zoom-out')"
      >
        －
      </button>

      <button
        class="dpad-btn"
        :class="{ 'dpad-btn--disabled': !panEnabled }"
        :disabled="!panEnabled"
        title="Pan left"
        @click="panEnabled && emit('pan-left')"
      >
        ◀
      </button>
      <button
        class="dpad-btn"
        title="Centre view"
        @click="emit('centre')"
      >
        ⊙
      </button>
      <button
        class="dpad-btn"
        :class="{ 'dpad-btn--disabled': !panEnabled }"
        :disabled="!panEnabled"
        title="Pan right"
        @click="panEnabled && emit('pan-right')"
      >
        ▶
      </button>

      <button
        class="dpad-btn"
        :title="expandTitle"
        @click="emit('expand')"
      >
        ⛶
      </button>
      <button
        class="dpad-btn"
        :class="{ 'dpad-btn--disabled': !panEnabled }"
        :disabled="!panEnabled"
        title="Pan down"
        @click="panEnabled && emit('pan-down')"
      >
        ▼
      </button>
      <button
        class="dpad-btn"
        title="Fit to view"
        @click="emit('fit')"
      >
        ⤢
      </button>
    </div>
  </div>
</template>

<style scoped>
.graph-dpad-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.graph-zoom-hud {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.3rem 0.6rem;
  background: color-mix(in oklch, var(--ui-bg-elevated) 80%, transparent);
  backdrop-filter: blur(4px);
  border: 1px solid color-mix(in oklch, var(--glow) 22%, transparent);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--ui-text-muted);
  pointer-events: none;
}

.graph-zoom-level {
  color: var(--ui-primary);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.graph-zoom-hint {
  color: var(--ui-text-dimmed);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.62rem;
}

.graph-dpad {
  display: grid;
  grid-template-columns: repeat(3, 32px);
  grid-template-rows: repeat(3, 32px);
  gap: 4px;
  background: color-mix(in oklch, var(--ui-bg) 70%, transparent);
  padding: 6px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.dpad-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-bg-elevated);
  border: 1px solid color-mix(in oklch, var(--glow) 22%, transparent);
  border-radius: 4px;
  color: var(--ui-text-highlighted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 0;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
  line-height: 1;
}

.dpad-btn:hover:not(:disabled) {
  background: var(--ui-bg);
  border-color: var(--ui-primary);
  color: var(--ui-primary);
}

.dpad-btn:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 1px;
}

.dpad-btn--disabled,
.dpad-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
