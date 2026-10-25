<script setup lang="ts">
import { IridisUiEvent } from '~/composables/types/index.ts';
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';

import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { wrap } from '~/composables/fsm/wrap.ts';

/**
 * Orbit/coverflow carousel. Cards curl along a cylinder arc: the active card
 * snaps flat to the front plane (interactive), neighbours angle inward to the
 * sides, scale down, dim, and recede in parallax — free-floating decks suspended
 * in space. Drag, arrow keys, dots, or click a side card to rotate.
 */
type CarouselFaceProximity = 'active' | 'neighbor' | 'distant';
type CarouselItem = { readonly 'key': string; readonly 'label': string };
interface CarouselSlotProps {
  readonly 'active': boolean;
  readonly 'index': number;
  readonly 'item': CarouselItem;
  readonly 'mounted': boolean;
  readonly 'proximity': CarouselFaceProximity;
}

const props = defineProps<{ items: ReadonlyArray<CarouselItem>; modelValue?: number }>();
const emit = defineEmits<{ 'update:modelValue': [index: number] }>();
defineSlots<{ 'default': (props: CarouselSlotProps) => unknown }>();

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
// Faces are absolutely positioned, so the scene needs an explicit active-face
// height. It belongs to the current rich face only: distant faces are merely
// lightweight affordances and must never reserve layout space or mount work.
const activeCardHeight = ref(720);

let startX = 0;

/**
 * Read once on mount (matches MotionShowcase.vue / ColorStreamCard.vue) —
 * faceStyle() sets its transition inline, which the reduced-motion media
 * query in main.css can never reach, so the short-circuit has to live here.
 */
const reducedMotion = ref(false);

const isLocal = computed(() => props.modelValue !== undefined);

const localDragPx = ref(0);
const isLocalDragging = ref(false);
const dragging = computed(() => (isLocal.value ? isLocalDragging.value : state.value.isDragging()));
const dragPx = computed(() => (isLocal.value ? localDragPx.value : state.value.dragOffset()));

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
    send(IridisUiEvent.dragStart());
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
  if (!state.value.isDragging()) return;
  send(IridisUiEvent.dragMove(e.clientX - startX));
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
  if (!state.value.isDragging()) return;
  const step = cardW.value * 0.55;
  const shiftedBy = Math.round(-dragPx.value / step);
  send(IridisUiEvent.dragEnd(n.value, shiftedBy));
}
function go(d: number): void {
  if (isLocal.value) { emit('update:modelValue', wrap(active.value + d, n.value)); return; }
  send(IridisUiEvent.navigate(n.value, d));
}
function select(i: number): void {
  if (isLocal.value) { emit('update:modelValue', i); return; }
  send(IridisUiEvent.selectCard(i));
}
function isActive(i: number): boolean { return i === active.value; }
function proximity(i: number): CarouselFaceProximity {
  const distance = Math.abs(signed(i));
  if (distance === 0) return 'active';
  if (distance === 1) return 'neighbor';
  return 'distant';
}
function isRichFace(i: number): boolean { return proximity(i) !== 'distant'; }

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
    'opacity': String(Math.max(0, 1 - ad * 0.6)),
    'zIndex': String(Math.max(1, 40 - Math.round(ad * 8))),
    'transition': (dragging.value || reducedMotion.value) ? 'none' : 'transform .7s cubic-bezier(.16,.84,.28,1), opacity .5s ease',
  };
}

function measureViewport(): void {
  if (typeof window === 'undefined') return;
  cardW.value = Math.min(760, Math.round(window.innerWidth * 0.92));
}
// index.vue mounts one CylinderCarousel per stage, and every one that
// scrolls near the viewport activates and registers its own keydown
// listener — a bare, unscoped listener would make a single arrow-key press
// advance every activated deck on the page at once. Scoping to "this
// widget's own DOM subtree is hovered, or holds focus" keeps the listener on
// window (so hovering without first clicking still works) while ensuring
// only the ONE deck the user is actually attending to reacts.
const rootRef = ref<HTMLElement | null>(null);
let isHovered = false;
function onPointerEnter(): void { isHovered = true; }
function onPointerLeave(): void { isHovered = false; }
function onKey(e: KeyboardEvent): void {
  const root = rootRef.value;
  if (!root) return;
  if (!isHovered && !root.contains(document.activeElement)) return;
  if (e.key === 'ArrowRight') go(1);
  if (e.key === 'ArrowLeft') go(-1);
}

const sceneRef = ref<HTMLElement | null>(null);
let cardResizeObserver: ResizeObserver | null = null;

function activeCard(): HTMLElement | undefined {
  const key = props.items[active.value]?.key;
  if (!sceneRef.value || key === undefined) return undefined;
  return Array.from(sceneRef.value.querySelectorAll<HTMLElement>('.cyl-card'))
    .find((card) => card.dataset.cylKey === key);
}

function naturalCardHeight(card: HTMLElement): number {
  return Math.ceil(card.scrollHeight);
}

function measureActiveCard(): void {
  const card = activeCard();
  if (card === undefined) return;
  activeCardHeight.value = naturalCardHeight(card);
}

function observeActiveCard(): void {
  cardResizeObserver?.disconnect();
  cardResizeObserver = null;
  measureActiveCard();
  const card = activeCard();
  const content = card?.querySelector<HTMLElement>('.cyl-card-content');
  if (content === null || content === undefined || typeof ResizeObserver === 'undefined') return;
  cardResizeObserver = new ResizeObserver(() => { measureActiveCard(); });
  cardResizeObserver.observe(content);
}

// The carousel is often below the fold (e.g. a second instance further down
// the page) — deferring measureViewport/observeAllCards/listener registration
// until it's actually near the viewport avoids doing 3D-transform layout work
// for a deck the user may never scroll to.
let activated = false;
function activate(): void {
  if (activated) return;
  activated = true;
  measureViewport();
  nextTick(observeActiveCard);
  window.addEventListener('resize', measureViewport);
  window.addEventListener('keydown', onKey);
}
watch(active, () => { if (activated) nextTick(observeActiveCard); }, { 'flush': 'post' });
watch(
  () => props.items.map((item) => item.key).join('|'),
  () => { if (activated) nextTick(observeActiveCard); },
  { 'flush': 'post' }
);
let visibilityObserver: IntersectionObserver | null = null;
onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  window.removeEventListener('resize', measureViewport);
  window.removeEventListener('keydown', onKey);
  visibilityObserver?.disconnect();
  cardResizeObserver?.disconnect();
});
</script>

<template>
  <div
    ref="rootRef"
    class="cyl"
    tabindex="0"
    role="group"
    aria-roledescription="carousel"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
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
        :style="{ height: (activeCardHeight + 40) + 'px' }"
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
            v-if="isRichFace(i)"
            class="glass scanlines cyl-card"
            :style="{ '--glow': 'var(--ui-primary)' }"
            :data-cyl-key="item.key"
          >
            <div class="cyl-card-tag font-display">
              <span class="cyl-dotlight" />
              <span class="cyl-card-tag-label">{{ item.label }}</span>
            </div>
            <div class="cyl-card-body">
              <div class="cyl-card-content">
                <slot
                  :item="item"
                  :active="isActive(i)"
                  :index="i"
                  :mounted="true"
                  :proximity="proximity(i)"
                />
              </div>
            </div>
          </div>
          <div
            v-else
            class="cyl-placeholder"
            :data-cyl-key="item.key"
            aria-hidden="true"
          >
            <span class="cyl-placeholder-label font-display">{{ item.label }}</span>
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
      <BalancedWrap
        class="cyl-dots"
        :items="[...items]"
        :min-width="90"
        :gap="6"
      >
        <template #default="{ item, index: i }">
          <UButton
            :label="item.label"
            :color="isActive(i) ? 'primary' : 'neutral'"
            :variant="isActive(i) ? 'solid' : 'soft'"
            size="xs"
            class="cyl-dot font-display flex-1 justify-center rounded-full"
            :class="{ 'cyl-dot-active': isActive(i) }"
            :aria-current="isActive(i) ? 'true' : undefined"
            @click="select(i)"
          />
        </template>
      </BalancedWrap>
    </div>
  </div>
</template>

<style scoped>
.cyl { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; width: 100%; }
/* The scene stays inside the same content column as every other stage.
   Off-active faces remain visually distinct through their depth transforms,
   but their clipping boundary now aligns with the page grid. */
.cyl-scene-wrap { position: relative; isolation: isolate; width: 100%; overflow-x: clip; }
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
     Its height follows the active card. Horizontal clipping prevents distant
     affordances from widening the page; vertical overflow remains visible so
     a genuinely expanding active card never becomes a nested scroller. */
  overflow-x: clip;
  overflow-y: visible;
  touch-action: pan-y;
}
/* Edge scrim: fades distant off-active cards into the page background at the
   scene's own left/right edges instead of letting their (still-legible-ish)
   text bleed all the way to the viewport boundary. z-index 28 sits between
   faceStyle()'s two zIndex bands — below the active/near-neighbour cards
   (ad<=1, zIndex>=32) and above the far/receding ones (ad>=2, zIndex<=24) —
   so it reads as scene depth, not a layer covering everything. Pointer
   events pass through so it never blocks a click on a far card (which
   brings it to front) or a scene-level drag. */
.cyl-scene::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 28;
  pointer-events: none;
  background: linear-gradient(90deg,
    var(--ui-bg) 0%,
    transparent 18%,
    transparent 82%,
    var(--ui-bg) 100%);
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
/* Below `lg` (the only range these render in — hidden entirely above it), the
   arrows sit dimmed at rest so they read as secondary chrome next to the
   card content rather than a second, equally-loud navigation system, and
   snap to full visibility on hover/focus/press so they're never invisible
   right when a pointer or keyboard user is actually reaching for one.
   min-width/min-height guarantee a 44x44px hit target regardless of the
   underlying UButton size's own (smaller) icon-only padding. */
.cyl-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  opacity: 0.45;
  transition: opacity 0.2s ease;
}
.cyl-nav:hover,
.cyl-nav:focus-visible,
.cyl-nav:active {
  opacity: 1;
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
.cyl-card { width: 100%; display: flex; flex-direction: column; }
.cyl-placeholder {
  display: grid;
  min-height: 4rem;
  place-items: center;
  border: 1px var(--iridis-border-style) color-mix(in oklch, var(--ui-border) 72%, transparent);
  border-radius: var(--iridis-radius-lg);
  background: var(--ui-bg-elevated);
  color: var(--ui-text-muted);
}
.cyl-placeholder-label {
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.cyl-card-tag {
  position: relative;
  flex: none; display: flex; align-items: center; justify-content: center;
  padding: 0.6rem 1rem;
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
  /* A raw palette shade (e.g. primary-400) is a decorative pick, never
     contrast-checked against any background — it happens to read fine on the
     dark glass card in dark framing but fails AA/AAA in light framing, where
     the same shade sits on a near-white tinted surface. --ui-text-highlighted
     is one of the engine's actual contrast-ENFORCED roles (text-strong vs
     background, verified by enforce:compliance) — same as this card's own
     93%-background glass surface — so it stays compliant in both framings.
     The glow stays purely in the text-shadow, which doesn't touch fill
     contrast. */
  color: var(--ui-text-highlighted);
  border-bottom: 1px var(--iridis-border-style) color-mix(in oklch, var(--glow) 22%, transparent);
  text-shadow: 0 0 12px color-mix(in oklch, var(--glow) 60%, transparent);
}
.cyl-card-tag-label { text-align: center; }
.cyl-dotlight {
  position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
  width: 0.5rem; height: 0.5rem; border-radius: var(--iridis-radius-full); background: var(--ui-primary); box-shadow: 0 0 10px var(--ui-primary);
}
.cyl-card-body { flex: 1 1 auto; overflow-x: clip; overflow-y: visible; padding: 1rem 1.1rem; }
.cyl-card-body :deep(.iridis-card) {
  background: transparent !important; border: none !important; box-shadow: none !important; backdrop-filter: none !important;
}
.cyl-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; justify-content: center; width: 100%; }
/* Row layout/gap/wrapping is BalancedWrap's own job (same component the top
   ToC bar uses) — evenly-balanced rows instead of a naive wrap that stranded
   a lone item on its own last row. */
.cyl-dots { width: 100%; }
.cyl-dot {
  /* Caps a lone item's own flex-1 utility class (see the template) — a
     single-item stage group would otherwise stretch its one dot to fill the
     full row width as a wall-to-wall glowing lozenge. This rule's scoped
     `[data-v-*]` attribute gives it higher specificity than the plain
     `.flex-1` utility, so a capped, centered pill wins without touching the
     template; multi-item rows are unaffected since BalancedWrap already
     balances those across their natural widths. */
  flex: 0 1 auto;
  min-width: 90px;
  max-width: 220px;
  font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase;
}
.cyl-dot-active {
  box-shadow: 0 0 16px color-mix(in oklch, var(--ui-primary) 70%, transparent);
}
</style>
