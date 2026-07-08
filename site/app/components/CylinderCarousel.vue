<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

/**
 * Orbit/coverflow carousel. Cards curl along a cylinder arc: the active card
 * snaps flat to the front plane (interactive), neighbours angle inward to the
 * sides, scale down, dim, and recede in parallax — free-floating decks suspended
 * in space. Drag, arrow keys, dots, or click a side card to rotate.
 */
const props = defineProps<{ items: ReadonlyArray<{ key: string; label: string }> }>();

const active = ref(0);
const n = computed(() => props.items.length);
const cardW = ref(540);
const cardH = ref(560);

const dragging = ref(false);
let startX = 0;
const dragPx = ref(0); // live horizontal drag in px

function onDown(e: PointerEvent): void {
  // Never hijack the pointer when it lands on the live front card's content —
  // that is what let the drag layer steal clicks from the forms. Dragging only
  // starts on the card frame, side cards, or empty scene.
  const t = e.target as HTMLElement;
  if (t.closest('.cyl-card-body')) return;
  dragging.value = true; startX = e.clientX; dragPx.value = 0;
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
function onMove(e: PointerEvent): void {
  if (!dragging.value) return;
  dragPx.value = e.clientX - startX;
}
function onUp(): void {
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  if (!dragging.value) return;
  dragging.value = false;
  const step = cardW.value * 0.55;
  const shifted = Math.round(-dragPx.value / step);
  if (shifted !== 0) active.value = (((active.value + shifted) % n.value) + n.value) % n.value;
  dragPx.value = 0;
}
function go(d: number): void { active.value = (((active.value + d) % n.value) + n.value) % n.value; }
function select(i: number): void { active.value = i; }
function isActive(i: number): boolean { return i === active.value; }

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
    'width': `${cardW.value}px`,
    'height': `${cardH.value}px`,
    'transform': transform,
    'opacity': ad > 2.4 ? '0' : String(Math.max(0.12, 1 - ad * 0.34)),
    'filter': isActive(i) ? 'none' : `blur(${Math.min(5, ad * 1.5)}px)`,
    'pointerEvents': isActive(i) ? 'auto' : 'none',
    'zIndex': String(50 - Math.round(ad * 10)),
    'transition': dragging.value ? 'none' : 'transform .7s cubic-bezier(.16,.84,.28,1), opacity .5s ease, filter .5s ease',
  };
}

function measure(): void {
  if (typeof window === 'undefined') return;
  cardW.value = Math.min(560, Math.round(window.innerWidth * 0.84));
  cardH.value = Math.min(600, Math.round(window.innerHeight * 0.7));
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
    <div
      class="cyl-scene"
      :style="{ height: `${cardH + 40}px` }"
      @pointerdown="onDown"
    >
      <div
        v-for="(item, i) in items"
        :key="item.key"
        class="cyl-face"
        :class="{ active: isActive(i) }"
        :style="faceStyle(i)"
        @click="!isActive(i) && select(i)"
      >
        <div
          class="glass scanlines cyl-card"
          :class="{ float: !isActive(i) }"
          :style="{ '--glow': 'var(--ui-primary)' }"
        >
          <div class="cyl-card-tag font-display">
            <span class="cyl-dotlight" />{{ item.label }}
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

    <div class="cyl-controls">
      <UButton
        icon="i-material-symbols-chevron-left-rounded"
        color="neutral"
        variant="soft"
        size="lg"
        class="pulse"
        aria-label="Previous"
        @click="go(-1)"
      />
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
      <UButton
        icon="i-material-symbols-chevron-right-rounded"
        color="neutral"
        variant="soft"
        size="lg"
        class="pulse"
        aria-label="Next"
        @click="go(1)"
      />
    </div>
  </div>
</template>

<style scoped>
.cyl { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
.cyl-scene {
  position: relative;
  width: 100%;
  touch-action: pan-y;
}
.cyl-face {
  position: absolute; top: 20px; left: 50%;
  transform-origin: center center;
  will-change: transform, opacity;
  cursor: pointer;
}
.cyl-face.active { cursor: default; }
/* Only the front face is hittable. Force every descendant of a non-active face
   inert so its buttons/inputs can never steal a click from the front card
   (Nuxt UI re-enables pointer-events on some controls). */
.cyl-face:not(.active),
.cyl-face:not(.active) :deep(*) {
  pointer-events: none !important;
}
.cyl-card { height: 100%; width: 100%; display: flex; flex-direction: column; overflow: hidden; }
.cyl-card-tag {
  flex: none; display: flex; align-items: center; gap: 0.5rem;
  padding: 0.6rem 1rem;
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--ui-color-primary-400);
  border-bottom: 1px solid color-mix(in oklch, var(--glow) 22%, transparent);
  text-shadow: 0 0 12px color-mix(in oklch, var(--glow) 60%, transparent);
}
.cyl-dotlight { width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: var(--ui-primary); box-shadow: 0 0 10px var(--ui-primary); }
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
  color: var(--ui-bg); background: var(--ui-primary); border-color: var(--ui-primary);
  box-shadow: 0 0 16px color-mix(in oklch, var(--ui-primary) 70%, transparent);
}
</style>
