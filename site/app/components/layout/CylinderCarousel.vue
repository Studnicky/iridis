<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';

import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { useDebouncedResizeObserver } from '~/composables/useDebouncedResizeObserver.ts';
import { wrap } from '~/composables/fsm/wrap.ts';

/**
 * Orbit/coverflow carousel. Cards curl along a cylinder arc: the active card
 * snaps flat to the front plane (interactive), neighbours angle inward to the
 * sides, scale down, dim, and recede in parallax — free-floating decks suspended
 * in space. Drag, arrow keys, dots, or click a side card to rotate.
 */
const props = defineProps<{ items: ReadonlyArray<{ key: string; label: string }>; modelValue?: number }>();
const emit = defineEmits<{ 'update:modelValue': [index: number] }>();

/**
 * When `modelValue` is passed (even as an uncontrolled second carousel
 * instance), navigation is fully local — this deck must never read or
 * dispatch to the page's global FSM, or it would fight the top-level
 * carousel over the SAME shared activeIndex. Omitting `modelValue` entirely
 * preserves the original global-FSM-driven behavior byte-for-byte.
 */
const { send, state } = useIridisUiMachine();
const active = computed(() => props.modelValue ?? state.value.activeIndex);
const n = computed(() => props.items.length);
const cardW = ref(760);
// cardH is the MAX natural content height across every face, not just the
// active one — every card renders at this SAME explicit height (see
// cardStyle below), so switching faces never resizes the deck and no face is
// ever taller than the box it's given. Tracked per-index in cardHeights (see
// observeAllCards) since .cyl-face is absolutely positioned and wouldn't
// otherwise contribute to .cyl-scene's height at all.
const cardHeights = ref<Record<number, number>>({});
const cardH = computed(() => {
  const heights = Object.values(cardHeights.value);
  return heights.length > 0 ? Math.max(...heights) : 720;
});

let startX = 0;

const isLocal = computed(() => props.modelValue !== undefined);

const localDragPx = ref(0);
const isLocalDragging = ref(false);
const dragging = computed(() => (isLocal.value ? isLocalDragging.value : state.value.variant === 'dragging'));
const dragPx = computed(() => (isLocal.value ? localDragPx.value : (state.value.variant === 'dragging' ? state.value.dragPx : 0)));

function onDown(e: PointerEvent): void {
  // Never hijack the pointer when it lands on the live front card's content —
  // that is what let the drag layer steal clicks from the forms. Dragging only
  // starts on the card frame, side cards, or empty scene.
  const t = e.target as HTMLElement;
  if (t.closest('.cyl-card-body')) return;
  if (isLocal.value) {
    isLocalDragging.value = true;
    localDragPx.value = 0;
  } else {
    send({ 'type': IridisUiActionType.DRAG_START });
  }
  startX = e.clientX;
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
function onMove(e: PointerEvent): void {
  if (isLocal.value) {
    if (!isLocalDragging.value) return;
    localDragPx.value = e.clientX - startX;
    return;
  }
  if (state.value.variant !== 'dragging') return;
  send({ 'dragPx': e.clientX - startX, 'type': IridisUiActionType.DRAG_MOVE });
}
function onUp(): void {
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  if (isLocal.value) {
    if (!isLocalDragging.value) return;
    const step = cardW.value * 0.55;
    const shiftedBy = Math.round(-localDragPx.value / step);
    isLocalDragging.value = false;
    localDragPx.value = 0;
    if (shiftedBy !== 0) emit('update:modelValue', wrap(active.value + shiftedBy, n.value));
    return;
  }
  if (state.value.variant !== 'dragging') return;
  const step = cardW.value * 0.55;
  const shiftedBy = Math.round(-dragPx.value / step);
  send({ 'count': n.value, 'shiftedBy': shiftedBy, 'type': IridisUiActionType.DRAG_END });
}
function go(d: number): void {
  if (isLocal.value) { emit('update:modelValue', wrap(active.value + d, n.value)); return; }
  send({ 'count': n.value, 'delta': d, 'type': IridisUiActionType.NAVIGATE });
}
function select(i: number): void {
  if (isLocal.value) { emit('update:modelValue', i); return; }
  send({ 'index': i, 'type': IridisUiActionType.SELECT_CARD });
}
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
/** Every card renders at the SAME explicit height (the max across all faces) so the deck never resizes when switching. */
function cardStyle(): Record<string, string> {
  return { 'height': `${cardH.value}px` };
}

function measureWidth(): void {
  if (typeof window === 'undefined') return;
  cardW.value = Math.min(760, Math.round(window.innerWidth * 0.92));
}
function onKey(e: KeyboardEvent): void {
  if (e.key === 'ArrowRight') go(1);
  if (e.key === 'ArrowLeft') go(-1);
}

// Every .cyl-card is observed continuously (not just the active one), so a
// face that isn't currently front-and-center still contributes its natural
// height to the shared max — switching to it never causes a late resize
// jump, and a card whose own content grows post-mount (e.g. an expanding
// accordion) updates the shared max even while it's in the background.
// data-cyl-index on each card lets the observer attribute entries back to
// their face index. Debounced like BalancedWrap's ResizeObserver convention.
const sceneRef = ref<HTMLElement | null>(null);
const cardResizeObserver = useDebouncedResizeObserver((entries) => {
  const next = { ...cardHeights.value };
  for (const entry of entries) {
    const bodyEl = entry.target as HTMLElement;
    const cardEl = bodyEl.closest<HTMLElement>('.cyl-card');
    if (!cardEl) continue;
    const idx = Number(cardEl.dataset.cylIndex);
    next[idx] = naturalCardHeight(cardEl);
  }
  cardHeights.value = next;
}, 100);
/**
 * A card's own getBoundingClientRect()/ResizeObserver size is NOT its true
 * natural content height once cardStyle() has applied an explicit height to
 * it — that would just report back whatever height we already imposed,
 * circularly. .cyl-card-body's scrollHeight always reflects its full content
 * height regardless of any height clamp/overflow applied to it or its
 * ancestors, so tag-bar height + body scrollHeight is the true unclamped
 * natural height of the card.
 */
function naturalCardHeight(cardEl: HTMLElement): number {
  const tag = cardEl.querySelector<HTMLElement>('.cyl-card-tag');
  const body = cardEl.querySelector<HTMLElement>('.cyl-card-body');
  return Math.round((tag?.offsetHeight ?? 0) + (body?.scrollHeight ?? 0));
}
function observeAllCards(): void {
  if (!sceneRef.value) return;
  const cards = sceneRef.value.querySelectorAll<HTMLElement>('.cyl-card');
  const heights: Record<number, number> = {};
  cards.forEach((el) => {
    const idx = Number(el.dataset.cylIndex);
    heights[idx] = naturalCardHeight(el);
  });
  cardHeights.value = heights;
  cards.forEach((el) => cardResizeObserver.observe(el));
}

// The carousel is often below the fold (e.g. a second instance further down
// the page) — deferring measureWidth/observeAllCards/listener registration
// until it's actually near the viewport avoids doing 3D-transform layout work
// for a deck the user may never scroll to.
let activated = false;
function activate(): void {
  if (activated) return;
  activated = true;
  measureWidth();
  nextTick(() => observeAllCards());
  window.addEventListener('resize', measureWidth);
  window.addEventListener('keydown', onKey);
}
let visibilityObserver: IntersectionObserver | null = null;
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !sceneRef.value) {
    activate();
    return;
  }
  visibilityObserver = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      activate();
      visibilityObserver?.disconnect();
      visibilityObserver = null;
    }
  }, { rootMargin: '400px' });
  visibilityObserver.observe(sceneRef.value);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', measureWidth);
  window.removeEventListener('keydown', onKey);
  visibilityObserver?.disconnect();
  cardResizeObserver.disconnect();
});
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
        ref="sceneRef"
        class="cyl-scene"
        :style="{ height: (cardH + 40) + 'px' }"
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
            :style="{ '--glow': 'var(--ui-primary)', ...cardStyle() }"
            :data-cyl-index="i"
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
        <UButton
          v-for="(item, i) in items"
          :key="item.key"
          :label="item.label"
          :color="isActive(i) ? 'primary' : 'neutral'"
          :variant="isActive(i) ? 'solid' : 'soft'"
          size="xs"
          class="cyl-dot font-display rounded-full"
          :class="{ 'cyl-dot-active': isActive(i) }"
          :aria-current="isActive(i) ? 'true' : undefined"
          @click="select(i)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cyl { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; width: 100%; }
/* Full-bleed: breaks the scene out of the parent <UContainer>'s max-width so
   there's genuine room for 2 real neighbours on each side before anything
   needs to clip, rather than the coverflow's side cards hitting a narrower
   container edge and getting cut off. .cyl-scene's own overflow-x:hidden
   (below) is what actually stops off-screen cards from expanding page
   scroll — it now clips at the true viewport edge instead of a narrower one. */
/* `left: 50%` on a position:relative element resolves against its OWN
   PARENT's width, not the viewport (that containing-block rule only differs
   for position:absolute) — so it can never correctly full-bleed a relatively
   positioned element out of a centered container. margin-left with a mixed
   %/vw calc() is the robust trick: the parent-relative and viewport-relative
   terms cancel out algebraically as long as the parent itself is centered
   (mx-auto), landing the box's left edge at the true viewport edge (x=0)
   regardless of the parent's own width. */
/* align-self:flex-start exempts this item from .cyl's align-items:center
   cross-axis centering — that centering is computed against .cyl's own
   (narrow, container-width) cross-axis size, which fights the margin-based
   full-bleed math below (it would re-center the already-100vw box against
   the wrong, narrower width). With centering off, the margin trick lands
   the box's left edge at the true viewport edge as intended. */
/* isolation:isolate gives the scene its own permanent stacking context,
   independent of any ancestor. Without it, toggling CvdPreviewOverlay's
   `filter` on `.cvd-preview-wrap` (an ancestor of this whole page) creates
   or destroys a compositing layer on that ancestor — which can force the
   cards' per-element 3D transforms (perspective()/rotateY()/translateZ() in
   faceStyle()) to re-establish paint order, visibly "popping" the deck even
   though no box position actually changes. Isolating this subtree's
   stacking context up front means an ancestor filter switching on or off
   never touches it. */
.cyl-scene-wrap { position: relative; isolation: isolate; align-self: flex-start; width: 100vw; margin-left: calc(50% - 50vw); }
.cyl-scene {
  position: relative;
  width: 100%;
  /* Off-active .cyl-face cards translateX() out to roughly ±(n/2 * spread)
     from center — several thousand px for a 10-card deck — so without
     overflow-x clipping here, those decorative off-screen cards silently
     widen the whole PAGE's scrollable area, not just this widget's. Any
     native horizontal scroll trigger (scrollIntoView, browser autofill
     focus, etc.) then shifts window.scrollX to "satisfy" them, visibly
     shoving the entire page sideways. Since .cyl-scene-wrap is now full-bleed
     (100vw), this clips at the true viewport edge — genuine neighbours within
     that width are never cut off, only decorative cards further out are.
     Height is content-driven (see observeAllCards) — every face shares the
     same explicit height (the max across all of them). overflow-y is pinned
     to clip (not left at the visible default): per spec, when one axis is
     non-visible and the other is visible, the visible axis computes to auto
     — so overflow-x:hidden alone silently turns overflow-y into auto and
     gives this scene its own independent scrollbar the instant any face's
     content transiently exceeds the shared height (e.g. mid-ResizeObserver
     settle). Clipping instead of scrolling keeps this a single page-scroll
     surface, matching cardStyle()'s own overflow:hidden. */
  overflow-x: hidden;
  overflow-y: clip;
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
/* Height is set inline (cardStyle()) to the shared max across every face, so
   every card is uniformly tall — no face's content is ever clipped, and
   switching between a short and a tall face never resizes the deck. */
.cyl-card { width: 100%; display: flex; flex-direction: column; overflow: hidden; }
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
/* min-height:0 overrides the flex-item default (min-height:auto), which
   otherwise refuses to shrink below the content's own natural size even
   inside a shorter, uniformly-sized .cyl-card — without it, a face taller
   than the shared max height would overflow its box instead of scrolling
   within it. Vertical overflow scrolls (never clips) so a face whose content
   genuinely exceeds the deck's shared height stays fully reachable; horizontal
   stays clipped since no card content is meant to scroll sideways. */
.cyl-card-body { flex: 1 1 auto; min-height: 0; overflow-x: hidden; overflow-y: auto; padding: 1rem 1.1rem; }
.cyl-card-body :deep(.iridis-card) {
  background: transparent !important; border: none !important; box-shadow: none !important; backdrop-filter: none !important;
}
.cyl-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; justify-content: center; }
.cyl-dots { display: flex; gap: 0.35rem; flex-wrap: wrap; justify-content: center; }
.cyl-dot {
  font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase;
}
.cyl-dot-active {
  box-shadow: 0 0 16px color-mix(in oklch, var(--ui-primary) 70%, transparent);
}
</style>
