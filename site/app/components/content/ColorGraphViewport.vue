<script setup lang="ts">
import type { DpadMachine } from './viz/DpadMachine.ts';
import type { LegendMachine } from './viz/LegendMachine.ts';

const props = defineProps<{
  fullscreen: boolean;
  loading: boolean;
  loadError: string | null;
  zoomLevel: number;
  roleCount: number;
  legendMachine: LegendMachine;
  dpadMachine: DpadMachine;
  dpadReady: boolean;
}>();

const containerRef = defineModel<HTMLDivElement | null>('containerRef', { default: null });
const labelsRef = defineModel<HTMLCanvasElement | null>('labelsRef', { default: null });
</script>

<template>
  <!--
    CylinderCarousel (this card's own ancestor) applies a 3D `transform`
    (perspective/rotateY/translateZ), which creates a containing block for
    any `position: fixed` descendant — so .cg-wrap--fullscreen's
    `position: fixed; inset: 0` would otherwise only ever fill the carousel
    card, not the viewport. Teleporting to <body> while fullscreen escapes
    that transformed ancestor entirely; `:disabled="!fullscreen"` keeps the
    card rendered in place (and out of `document.body`) the rest of the
    time, and since fullscreen only ever flips true from a user click (never
    during SSR/first render), there's no server-side teleport to reconcile.
  -->
  <Teleport
    to="body"
    :disabled="!fullscreen"
  >
    <div
      class="cg-wrap"
      :class="{ 'cg-wrap--fullscreen': fullscreen }"
    >
      <div class="cg-canvas">
        <div
          v-if="loading"
          class="cg-overlay"
        >
          Loading graph engine…
        </div>
        <div
          v-else-if="loadError"
          class="cg-overlay cg-error"
        >
          Graph failed: {{ loadError }}
        </div>

        <div
          ref="containerRef"
          class="cg-cosmos"
          :aria-label="`Resolved role graph, iridis-${roleCount}`"
        />
        <canvas
          ref="labelsRef"
          class="cg-labels"
          aria-hidden="true"
        />

        <GraphLegend
          v-if="!loading && !loadError"
          :machine="props.legendMachine"
          class="cg-legend-pos"
        />

        <div
          v-if="!loading && !loadError"
          class="cg-dpad-pos"
        >
          <GraphDpad
            :machine="props.dpadMachine"
            :dpad-ready="props.dpadReady"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cg-wrap {
  width: 100%;
  height: 32rem;
}
.cg-wrap--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 200;
  height: 100vh;
  background: var(--ui-bg);
}
.cg-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--iridis-radius-lg, 1rem);
  overflow: hidden;
  background: radial-gradient(circle at center, color-mix(in oklch, var(--glow) 8%, transparent), var(--ui-bg) 70%);
  border: 1px solid color-mix(in oklch, var(--glow) 22%, transparent);
}
.cg-cosmos {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.cg-labels {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.cg-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  color: var(--ui-text-dimmed);
  font-style: italic;
  pointer-events: none;
  padding: 0 1rem;
  text-align: center;
}
.cg-error { color: var(--ui-color-error-500); }
.cg-legend-pos {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 4;
}
.cg-dpad-pos {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 5;
}
</style>
