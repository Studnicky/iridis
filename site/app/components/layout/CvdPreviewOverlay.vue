<script setup lang="ts">
/**
 * Visual CVD preview: a real SVG filter that recolors the whole app the way
 * a person with the selected color-vision deficiency would see it. This is
 * distinct from `cvdCorrect` (packages/contrast enforce:cvdSimulate), which
 * adjusts the palette's own colors so a CVD-affected viewer can still
 * distinguish them — that's a contrast-math correction, applied unconditionally
 * to what everyone sees. This overlay is the inverse: it never touches the
 * palette, it only changes what THIS viewer sees, so a non-affected user can
 * observe the current (corrected or not) palette through simulated eyes.
 * `cvdPreviewTypes` is read-only here; the toggle UI lives in PaletteControls.vue.
 * It's a Set, not a single value — real CVD isn't always one condition, so
 * more than one type can be active at once. When it is, their filters chain:
 * `filter: url(#a) url(#b)` applies the first simulation's full output as the
 * SECOND simulation's input, i.e. "what a deuteranope sees when looking at
 * what a protanope already sees" — a reasonable approximation for a combined
 * deficiency, composed from the same real per-type matrices rather than an
 * invented blended one.
 *
 * Filter graph mirrors EnforceCvdSimulate.ts's simulateColor(): gamma-decode
 * sRGB -> linear, apply the 3x3 CVD matrix from `cvdMatrices`, gamma-encode
 * back to sRGB. SVG's feComponentTransfer only supports single-exponent gamma
 * curves, not sRGB's actual piecewise transfer function, so both transfer
 * steps use the standard gamma-2.2 approximation — the same approximation
 * browsers' own accessibility/CVD-simulation tools use for real-time filters.
 * All four filters are predefined so toggling any combination is instant.
 */
import type { CvdMatrixInterfaceType } from '@studnicky/iridis-contrast';

import { cvdMatrices } from '@studnicky/iridis-contrast';
import { computed } from 'vue';

import { useIridis } from '~/composables/useIridis.ts';

const { cvdPreviewTypes } = useIridis();

const SRGB_GAMMA = 2.2;

/** Pads a row-major 3x3 RGB matrix into feColorMatrix's 4x5 grid (alpha untouched). */
function toFeColorMatrixValues(m: CvdMatrixInterfaceType): string {
  const v = m.matrix;
  return [
    v[0], v[1], v[2], 0, 0,
    v[3], v[4], v[5], 0, 0,
    v[6], v[7], v[8], 0, 0,
    0, 0, 0, 1, 0
  ].join(' ');
}

const filterId = (name: string): string => {return `cvd-${name}`;};

/** Insertion order of the Set = the order types were toggled on, i.e. the
 * order their filters chain — the most recently added simulates "looking at"
 * whatever the earlier ones already produced. */
const activeFilterChain = computed<string>(() => {
  const ids = [...cvdPreviewTypes.value].map((t) => {return `url(#${filterId(t)})`;});
  return ids.length > 0 ? ids.join(' ') : 'none';
});
</script>

<template>
  <svg
    class="cvd-preview-defs"
    aria-hidden="true"
  >
    <defs>
      <filter
        v-for="m in cvdMatrices"
        :id="filterId(m.name)"
        :key="m.name"
        color-interpolation-filters="sRGB"
      >
        <feComponentTransfer result="linear">
          <feFuncR
            type="gamma"
            :exponent.attr="SRGB_GAMMA"
            amplitude="1"
            offset="0"
          />
          <feFuncG
            type="gamma"
            :exponent.attr="SRGB_GAMMA"
            amplitude="1"
            offset="0"
          />
          <feFuncB
            type="gamma"
            :exponent.attr="SRGB_GAMMA"
            amplitude="1"
            offset="0"
          />
        </feComponentTransfer>
        <feColorMatrix
          in="linear"
          type="matrix"
          :values.attr="toFeColorMatrixValues(m)"
          result="simulated"
        />
        <feComponentTransfer in="simulated">
          <feFuncR
            type="gamma"
            :exponent.attr="1 / SRGB_GAMMA"
            amplitude="1"
            offset="0"
          />
          <feFuncG
            type="gamma"
            :exponent.attr="1 / SRGB_GAMMA"
            amplitude="1"
            offset="0"
          />
          <feFuncB
            type="gamma"
            :exponent.attr="1 / SRGB_GAMMA"
            amplitude="1"
            offset="0"
          />
        </feComponentTransfer>
      </filter>
    </defs>
  </svg>
  <div
    class="cvd-preview-wrap"
    :style="{ filter: activeFilterChain }"
  >
    <slot />
  </div>
</template>

<style scoped>
.cvd-preview-defs { position: absolute; width: 0; height: 0; overflow: hidden; }

.cvd-preview-wrap {
  min-height: 100vh;
}

@media (prefers-reduced-motion: no-preference) {
  .cvd-preview-wrap {
    transition: filter 0.25s ease;
  }
}
</style>
