<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';

/**
 * Orbit/coverflow carousel. Cards curl along a cylinder arc: the active card
 * snaps flat to the front plane (interactive), neighbours angle inward to the
 * sides, scale down, dim, and recede in parallax — free-floating decks suspended
 * in space. Drag, arrow keys, dots, or click a side card to rotate.
 */
const props = defineProps<{ items: ReadonlyArray<{ key: string; label: string }> }>();

const { send, state } = useIridisUiMachine();
const active = computed(() => state.value.activeIndex);
const dragging = computed(() => state.value.variant === 'dragging');
const dragPx = computed(() => (state.value.variant === 'dragging' ? state.value.dragPx : 0));
const n = computed(() => props.items.length);
// Mirrors the CSS `min()` sizing below (.cyl-face) so the drag-step/spread math
// stays correct even before the post-mount measure() reconciles it — the
// rendered box size itself is CSS-only and never changes after hydration.
const cardW = ref(760);
const cardH = ref(720);

let startX = 0;

function onDown(e: PointerEvent): void {
  // Never hijack the pointer when it lands on the live front card's content —
  // that is what let the drag layer steal clicks from the forms. Dragging only
  // starts on the card frame, side cards, or empty scene.
  const t = e.target as HTMLElement;
  if (t.closest('.cyl-card-body')) return;
  send({ 'type': IridisUiActionType.DRAG_START }); startX = e.clientX;
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
function onMove(e: PointerEvent): void {
  if (state.value.variant !== 'dragging') return;
  send({ 'dragPx': e.clientX - startX, 'type': IridisUiActionType.DRAG_MOVE });
}
function onUp(): void {
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  if (state.value.variant !== 'dragging') return;
  const step = cardW.value * 0.55;
  const shiftedBy = Math.round(-dragPx.value / step);
  send({ 'count': n.value, 'shiftedBy': shiftedBy, 'type': IridisUiActionType.DRAG_END });
}
function go(d: number): void { send({ 'count': n.value, 'delta': d, 'type': IridisUiActionType.NAVIGATE }); }
function select(i: number): void { send({ 'index': i, 'type': IridisUiActionType.SELECT_CARD }); }
function isActive(i: number): boolean { return i === active.value; }

/**
 * Click-to-select a background face. Guarded against `.cyl-card-body`: without
 * it, an in-card control that itself changes activeIndex (e.g. a card sending its
 * own SELECT_CARD) makes `isActive(i)` flip to false mid-bubble, so the SAME click
 * event reaching this ancestor handler would immediately select the OLD face
 * back — a self-reverting race. Bringing a background card to front is only
 * ever a click on its frame, never on its live content.
 */
function onFaceClick(e: MouseEvent, i: number): void {
  if ((e.target as HTMLElement).closest('.cyl-card-body')) return;
  if (!isActive(i)) select(i);
}

/** Signed shortest offset of card i from the active card (…-2,-1,0,1,2…). */
function signed(i: number): number {
  let d = ((i - active.value) % n.value + n.value) % n.value;
  if (d > n.value / 2) d -= n.value;
  return d;
}
function faceStyle(i: number): Record<string, string> {
  const d = signed(i);
  const ad = Math.abs(d);
  const spread = cardW.value * 0.56;
  const live = dragging.value ? dragPx.value : 0;
  // The active card is pure 2D — no perspective/rotateY — so its descendants'
  // getBoundingClientRect is accurate and teleported dropdowns position under
  // their trigger. Only the angled neighbours carry per-card 3D.
  const transform = ad === 0
    ? `translateX(calc(-50% + ${live}px))`
    : `translateX(calc(-50% + ${d * spread + live}px)) perspective(1300px) rotateY(${d * -32}deg) translateZ(${-ad * 150}px) scale(${Math.max(0.6, 1 - ad * 0.07)})`;
  return {
    'transform': transform,
    'opacity': ad > 2.4 ? '0' : String(Math.max(0.12, 1 - ad * 0.34)),
    'filter': isActive(i) ? 'none' : `blur(${Math.min(5, ad * 1.5)}px)`,
    'zIndex': String(Math.max(1, 40 - Math.round(ad * 8))),
    'transition': dragging.value ? 'none' : 'transform .7s cubic-bezier(.16,.84,.28,1), opacity .5s ease, filter .5s ease',
  };
}

function measure(): void {
  if (typeof window === 'undefined') return;
  cardW.value = Math.min(760, Math.round(window.innerWidth * 0.92));
  cardH.value = Math.min(720, Math.round(window.innerHeight * 0.8));
}
function onKey(e: KeyboardEvent): void {
  if (e.key === 'ArrowRight') go(1);
  if (e.key === 'ArrowLeft') go(-1);
}
onMounted(() => { measure(); window.addEventListener('resize', measure); window.addEventListener('keydown', onKey); });
onBeforeUnmount(() => { window.removeEventListener('resize', measure); window.removeEventListener('keydown', onKey); });
</script>

<template>
  <div class="cyl">
    <div class="cyl-scene-wrap">
      <UButton
        icon="i-material-symbols-chevron-left-rounded"
        color="neutral"
        variant="soft"
        size="lg"
        class="pulse cyl-nav cyl-nav-prev"
        aria-label="Previous"
        @click="go(-1)"
      />
      <div
        class="cyl-scene"
        @pointerdown="onDown"
      >
        <div
          v-for="(item, i) in items"
          :key="item.key"
          class="cyl-face"
          :class="{ active: isActive(i) }"
          :style="faceStyle(i)"
          @click="onFaceClick($event, i)"
        >
          <div
            class="glass scanlines cyl-card"
            :class="{ float: !isActive(i) }"
            :style="{ '--glow': 'var(--ui-primary)' }"
          >
            <div class="cyl-card-tag font-display">
              <span class="cyl-dotlight" />
              <span class="cyl-card-tag-label">{{ item.label }}</span>
            </div>
            <div class="cyl-card-body">
              <slot
                :item="item"
                :active="isActive(i)"
                :index="i"
              />
            </div>
          </div>
        </div>
      </div>
      <UButton
        icon="i-material-symbols-chevron-right-rounded"
        color="neutral"
        variant="soft"
        size="lg"
        class="pulse cyl-nav cyl-nav-next"
        aria-label="Next"
        @click="go(1)"
      />
    </div>

    <div class="cyl-controls">
      <div class="cyl-dots">
        <button
          v-for="(item, i) in items"
          :key="item.key"
          class="cyl-dot font-display"
          :class="{ on: isActive(i) }"
          @click="select(i)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cyl { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; width: 100%; overflow-x: hidden; }
.cyl-scene-wrap { position: relative; width: 100%; }
.cyl-scene {
  position: relative;
  width: 100%;
  /* Matches the .cyl-face min() sizing below so the scene never resizes after
     hydration — measure() only keeps the JS spread/drag-step math in sync.
     Off-active .cyl-face cards translateX() out to roughly ±(n/2 * spread)
     from center — several thousand px for a 10-card deck — so without
     overflow-x clipping here, those decorative off-screen cards silently
     widen the whole PAGE's scrollable area, not just this widget's. Any
     native horizontal scroll trigger (scrollIntoView, browser autofill
     focus, etc.) then shifts window.scrollX to "satisfy" them, visibly
     shoving the entire page sideways. */
  overflow-x: hidden;
  height: calc(min(720px, 80vh) + 40px);
  touch-action: pan-y;
}
/* Prev/Next sit pinned to the scene's left/right edges, vertically centered
   against the whole card (not the title bar) — never inline with the
   dot-pill list, so the pill list is free to wrap onto its own rows without
   shoving the arrows onto separate lines above/below it. Large screens have
   plenty of other ways to navigate (drag, keyboard, dots, clicking a visible
   side card), so the arrows are redundant chrome there — hidden above the
   `lg` breakpoint. On narrow screens they stay, offset just inside the card
   edge where there's room, naturally overlapping the card's own edge when
   there isn't (no extra logic needed — it's just absolute positioning). */
.cyl-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;
}
.cyl-nav-prev { left: 0.5rem; }
.cyl-nav-next { right: 0.5rem; }
@media (max-width: 640px) {
  .cyl-nav-prev { left: 0.25rem; }
  .cyl-nav-next { right: 0.25rem; }
}
@media (min-width: 1024px) {
  .cyl-nav { display: none; }
}
.cyl-face {
  position: absolute; top: 20px; left: 50%;
  width: min(760px, 92vw);
  height: min(720px, 80vh);
  transform-origin: center center;
  will-change: transform, opacity;
  cursor: pointer;
}
.cyl-face.active { cursor: default; }
/* The face frame itself stays hittable on every card — a click anywhere on a
   background face brings it to front (onFaceClick). Only its DESCENDANTS are
   forced inert, so an inner control (Nuxt UI re-enables pointer-events on
   some) can never steal that click or mutate state before the card is active. */
.cyl-face:not(.active) :deep(*) {
  pointer-events: none !important;
}
.cyl-card { height: 100%; width: 100%; display: flex; flex-direction: column; overflow: hidden; }
.cyl-card-tag {
  position: relative;
  flex: none; display: flex; align-items: center; justify-content: center;
  padding: 0.6rem 1rem;
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--ui-color-primary-400);
  border-bottom: 1px solid color-mix(in oklch, var(--glow) 22%, transparent);
  text-shadow: 0 0 12px color-mix(in oklch, var(--glow) 60%, transparent);
}
.cyl-card-tag-label { text-align: center; }
.cyl-dotlight {
  position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
  width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: var(--ui-primary); box-shadow: 0 0 10px var(--ui-primary);
}
.cyl-card-body { flex: 1 1 auto; overflow-y: auto; padding: 1rem 1.1rem; }
.cyl-card-body :deep(.iridis-card) {
  background: transparent !important; border: none !important; box-shadow: none !important; backdrop-filter: none !important;
}
.cyl-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; justify-content: center; }
.cyl-dots { display: flex; gap: 0.35rem; flex-wrap: wrap; justify-content: center; }
.cyl-dot {
  padding: 0.32rem 0.75rem;
  font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase;
  border-radius: 9999px;
  border: 1px solid color-mix(in oklch, var(--ui-primary) 25%, transparent);
  color: var(--ui-text-muted);
  background: color-mix(in oklch, var(--ui-bg-elevated) 60%, transparent);
  transition: all .25s ease;
}
.cyl-dot.on {
  color: var(--ui-primary-contrast); background: var(--ui-primary); border-color: var(--ui-primary);
  box-shadow: 0 0 16px color-mix(in oklch, var(--ui-primary) 70%, transparent);
}
</style>
