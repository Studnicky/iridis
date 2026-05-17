<script setup lang="ts">
/**
 * IridisSwatchTape.vue
 *
 * Thin strip pinned to the bottom of every page, painted as one
 * segment per resolved role in the active palette. Reads the inline
 * `--iridis-{role}` custom properties the docs projector wrote on
 * `document.documentElement` so the tape always shows the actual SPA
 * theme — even when the user's seed-color list is small (1-2 hex
 * codes that the engine expands into ~16 resolved roles via the role
 * schema). A live visual signature of the SPA theme.
 *
 * `themeStore` is referenced inside the computed so the segments
 * recompute when any config field changes, even though the read goes
 * through the DOM rather than through the store directly.
 *
 * Roles that paint near the page background (background, bg-soft,
 * surface, divider) are filtered out so they don't render as
 * invisible-on-bg segments.
 *
 * Hover lifts the tape and reveals each segment's hex on its own row.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { themeStore } from '../stores/themeDispatcher.ts';

interface SegmentInterface {
  readonly 'name': string;
  readonly 'hex':  string;
  readonly 'x':    number;
  readonly 'w':    number;
}

/* Roles whose color tracks the page background — emitting them as
   tape segments produces invisible bars that read as "broken." */
const SKIP_ROLES = new Set(['background', 'bg-soft', 'surface', 'divider', 'on-brand']);

/* Reactive tick that bumps when the projector finishes a run so the
   computed re-reads inline styles. The dispatcher updates documentElement
   *after* watch fires, so a Vue tick of latency is added by reading on
   nextFrame via an rAF + version bump. */
const projectorVersion = ref<number>(0);

function readResolvedRoles(): SegmentInterface[] {
  if (typeof document === 'undefined') return [];
  const root = document.documentElement;
  const seen: { 'name': string; 'hex': string }[] = [];
  for (let i = 0; i < root.style.length; i++) {
    const prop = root.style[i];
    if (prop === undefined || !prop.startsWith('--iridis-')) continue;
    const name = prop.slice('--iridis-'.length);
    if (SKIP_ROLES.has(name)) continue;
    const hex = root.style.getPropertyValue(prop).trim();
    if (!/^#[0-9a-fA-F]{3,8}$/.test(hex)) continue;
    seen.push({ 'name': name, 'hex': hex });
  }
  return seen;
}

watch(
  () => [themeStore.paletteColors, themeStore.framing, themeStore.roleSchema, themeStore.contrastLevel],
  () => {
    /* The dispatcher's projector writes CSS vars asynchronously after
       the store watch fires, so defer the re-read by one rAF to
       capture the new colors. */
    requestAnimationFrame(() => { projectorVersion.value += 1; });
  },
  { 'deep': true },
);

onMounted(() => {
  projectorVersion.value += 1;
});

const hovered = ref<boolean>(false);

const segments = computed<readonly SegmentInterface[]>(() => {
  /* Touch projectorVersion so the computed re-runs whenever the
     projector finishes a write. */
  void projectorVersion.value;
  const roles = readResolvedRoles();
  if (roles.length === 0) return [];
  const w = 100 / roles.length;
  return roles.map((r, i) => ({ 'name': r.name, 'hex': r.hex, 'x': i * w, 'w': w }));
});
</script>

<template>
  <ClientOnly>
    <div
      class="iridis-swatch-tape"
      :class="{ 'iridis-swatch-tape--hover': hovered }"
      aria-label="Active iridis palette"
      role="img"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
    >
      <div class="iridis-swatch-tape__strip">
        <span
          v-for="(seg, i) in segments"
          :key="`tape-${i}-${seg.name}`"
          class="iridis-swatch-tape__seg"
          :style="{ background: seg.hex, width: `${seg.w}%`, left: `${seg.x}%` }"
          :title="`${seg.name} · ${seg.hex}`"
        >
          <span class="iridis-swatch-tape__hex">{{ seg.name }} · {{ seg.hex }}</span>
        </span>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
.iridis-swatch-tape {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 25;
  pointer-events: auto;
  transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1);
}
.iridis-swatch-tape__strip {
  position: relative;
  height: 6px;
  width: 100%;
  background: var(--vp-c-bg);
  box-shadow: 0 -1px 0 var(--vp-c-divider);
  transition: height 260ms cubic-bezier(0.4, 0, 0.2, 1);
}
.iridis-swatch-tape__seg {
  position: absolute;
  top: 0;
  height: 100%;
  display: block;
  transition: width 260ms ease, left 260ms ease;
}
.iridis-swatch-tape__hex {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translate(-50%, -2px);
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  padding: 0.1rem 0.35rem;
  border-radius: 3px 3px 0 0;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms ease, transform 220ms ease;
}
.iridis-swatch-tape--hover .iridis-swatch-tape__strip { height: 24px; }
.iridis-swatch-tape--hover .iridis-swatch-tape__hex {
  opacity: 1;
  transform: translate(-50%, -6px);
}
@media (prefers-reduced-motion: reduce) {
  .iridis-swatch-tape,
  .iridis-swatch-tape__strip,
  .iridis-swatch-tape__seg,
  .iridis-swatch-tape__hex { transition: none; }
}
/* ── Responsive: shorter hex chips on phones, tap-to-toggle on touch.
   On coarse pointers the strip starts taller (12px) so users can see
   the palette without hover, and the hex chip stays out (no hover
   state to drive it). */
@media (pointer: coarse) {
  .iridis-swatch-tape__strip { height: 10px; }
  .iridis-swatch-tape__hex { display: none; }
}
@media (max-width: 640px) {
  .iridis-swatch-tape__hex {
    font-size: 0.55rem;
    padding: 0.05rem 0.25rem;
  }
}
</style>
