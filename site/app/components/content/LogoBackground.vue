<script setup lang="ts">
/**
 * Dispatches to the active theme's own logo-background effect (see
 * logoBackgrounds/index.ts). Rendered inside HeroBanner.vue's `relative` logo
 * wrapper, behind the logo `<img>` (z-10) — absolutely fills that wrapper,
 * pointer-events:none, out of the a11y tree. formal/gallery have no entry in
 * the map, so `Cmp` is undefined and nothing renders for them — that's their
 * intended "no motion" treatment, not a missing case.
 */
import { computed } from 'vue';
import { useAfterMount } from '~/composables/useAfterMount.ts';
import { useThemePreset } from '~/composables/useThemePreset.ts';
import { LOGO_BACKGROUNDS } from './logoBackgrounds/index.ts';

const { 'activeThemeKey': activeThemeKey } = useThemePreset();
const Cmp = computed(() => LOGO_BACKGROUNDS[activeThemeKey.value]);
/**
 * Different themes dispatch to structurally different components (not just a
 * different class on the same tag) — if this rendered during SSR/hydration,
 * a persisted non-default theme would mismatch the server's default-theme
 * markup deeply enough that Vue's hydration-mismatch recovery can leave the
 * DOM in a broken, empty state rather than cleanly swapping it. Gating the
 * whole dispatch behind `afterMount` means nothing renders until strictly
 * after hydration finishes, so there is never a mismatch to recover from.
 */
const afterMount = useAfterMount();
</script>

<template>
  <div
    class="pointer-events-none absolute inset-0"
    aria-hidden="true"
  >
    <component
      :is="Cmp"
      v-if="afterMount && Cmp"
    />
  </div>
</template>
