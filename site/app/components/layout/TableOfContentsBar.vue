<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDebouncedResizeObserver } from '~/composables/useDebouncedResizeObserver.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { useNavigationTargets } from '~/composables/useNavigationTargets.ts';
import { useTocBarMachine } from '~/composables/useTocBarMachine.ts';

/**
 * Two-tier wayfinding bar. Row 1 is the 6 stage-level jump targets — always
 * visible, primary weight, one persistent-filled chip marking "you are here"
 * (an IntersectionObserver scrollspy, mirroring CylinderCarousel.vue's own
 * `aria-current` pattern). Row 2 is only the currently-in-view stage's own
 * cards, secondary/dimmer — the SAME items the active stage's `.cyl-dots`
 * renders further down the page, kept in sync by pulling from the same
 * `cardTargets` table rather than a second, independently-flattened list.
 *
 * Non-sticky (in normal document flow, so the hero is visible in the first
 * viewport) until scroll passes `#toc-hero-sentinel` (mounted in index.vue
 * right after `<HeroBanner>`), at which point it becomes sticky. Once
 * sticky, it also goes "compact" (Row 1 collapses to just the current stage,
 * Row 2 hides) while the user is scrolling DOWN — reading — and re-expands
 * the instant they scroll back up to navigate. Below the `lg` breakpoint,
 * Row 1 renders as a single-row horizontal-scroll chip strip instead of
 * BalancedWrap's multi-row grid, and Row 2 never renders — mobile only ever
 * sees stage-level nav, never the full card list.
 *
 * Publishes its own measured height as `--toc-height` (a CSS custom property
 * on the root element) so every jump target's `scroll-margin-top` (see
 * main.css's `.toc-scroll-target` / index.vue) always accounts for however
 * tall the bar currently is — expanded, compact, or mobile.
 */
const { send } = useIridisUiMachine();
const { send: sendToc, state: tocState } = useTocBarMachine();
const { 'uploadedImages': uploadedImages } = useIridis();
const { 'cardTargets': cardTargets, 'stageTargets': stageTargets } = useNavigationTargets();

/** Mirrors index.vue's `visibleStageGroups` filter — Combine isn't rendered until an image is uploaded, so neither its stage pill nor its cards may appear here (a click would silently no-op against a section not in the DOM). */
const visibleStageTargets = computed(() => stageTargets
  .filter((target) => target.id !== 'combine' || uploadedImages.value.length > 0));
const visibleCardTargets = computed(() => cardTargets
  .filter((target) => target.stage !== 'combine' || uploadedImages.value.length > 0));

function select(id: string): void { send({ 'targetId': id, 'type': IridisUiActionType.NAVIGATE_TO_TARGET }); }

/** Scrollspy: which stage section is currently "in view" — the one authoritative "you are here", read by Row 1's active chip AND Row 2's card filter. Defaults to the first visible stage so SSR/pre-hydration content isn't unmarked. */
const activeStageId = ref<string>(visibleStageTargets.value[0]?.id ?? '');
let stageObserver: IntersectionObserver | null = null;

function teardownStageObserver(): void {
  stageObserver?.disconnect();
  stageObserver = null;
}

/** Re-observes exactly the currently-visible stage sections (by id, via `document.getElementById` — the same lookup `useNavigationTargets.ts`'s own `scrollToId` uses). Called on mount and whenever Combine's visibility toggles the stage set. */
function setupStageObserver(): void {
  teardownStageObserver();
  if (typeof IntersectionObserver === 'undefined' || typeof document === 'undefined') { return; }
  const elements = visibleStageTargets.value
    .map((target) => document.getElementById(target.id))
    .filter((el): el is HTMLElement => el !== null);
  if (elements.length === 0) { return; }
  if (!visibleStageTargets.value.some((target) => target.id === activeStageId.value)) {
    activeStageId.value = visibleStageTargets.value[0]?.id ?? '';
  }
  // "Current" is whichever observed section has crossed into the upper
  // fifth of the viewport and hasn't yet scrolled past its middle — the
  // standard scrollspy reading-position zone, not "the whole section is on
  // screen" (which would leave nothing active while a tall section scrolls
  // past, or mark several sections active at once on a short viewport).
  stageObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting);
    if (visible.length === 0) { return; }
    const top = visible.reduce((closest, entry) =>
      (entry.boundingClientRect.top < closest.boundingClientRect.top ? entry : closest));
    if (top.target.id) { activeStageId.value = top.target.id; }
  }, { 'rootMargin': '-15% 0px -70% 0px', 'threshold': [0, 1] });
  elements.forEach((el) => stageObserver?.observe(el));
}

/** Row 2: the active stage's own cards only — never every stage's, and never rendered when there's only the one (single-item stages like Upload/Combine already have their own name in Row 1; a redundant lone Row 2 pill under it adds nothing). */
const activeStageCardTargets = computed(() => visibleCardTargets.value
  .filter((target) => target.stage === activeStageId.value));

/** True once the user has scrolled past the hero — before that, the bar stays in normal document flow (non-sticky) so the hero is the first thing a mobile visitor sees. Derived from TocBarMachine's state rather than a local ref (see useTocBarMachine.ts / fsm/TocBarMachine.ts). */
const pastHero = computed(() => tocState.value.variant !== 'top');
/** Compact = sticky AND actively scrolling down (reading) — collapses to a slim single row (current stage only), re-expanding the instant the user scrolls up to navigate. */
const compact = computed(() => tocState.value.variant === 'compact');

let heroObserver: IntersectionObserver | null = null;
function setupHeroObserver(): void {
  if (typeof IntersectionObserver === 'undefined' || typeof document === 'undefined') { return; }
  const sentinel = document.getElementById('toc-hero-sentinel');
  if (!sentinel) { return; }
  heroObserver = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry) { sendToc({ 'type': entry.isIntersecting ? 'RETURN_TOP' : 'PAST_HERO' }); }
  });
  heroObserver.observe(sentinel);
}

/**
 * Toggling compact changes the sticky bar's height (Row 2 hides + padding
 * shrinks — currently ~40px), which reflows the page and nudges `scrollY` by
 * about that delta. THRESHOLD is set comfortably above that reflow magnitude
 * so the self-induced scroll from a mode transition can never itself cross
 * the threshold and register as a fresh gesture.
 */
const SCROLL_INTENT_THRESHOLD_PX = 48;

/**
 * Scroll-direction, rAF-throttled — a pure intent producer that sends
 * SCROLL_UP/SCROLL_DOWN to TocBarMachine; the machine (not this listener)
 * decides whether that intent actually changes the display mode.
 *
 * Flap-proof by construction, with no timer: `watch(() => tocState.value
 * .variant, ...)` below re-baselines `lastScrollY` to `window.scrollY`
 * every time the machine's state actually transitions. A mode transition's
 * own reflow-induced scroll is therefore always measured against a baseline
 * taken AFTER that reflow — so its delta starts at ~0 and can't reach
 * SCROLL_INTENT_THRESHOLD_PX, which is sized above the reflow's own
 * magnitude. The reflow can never be misread as a new gesture, so it can
 * never send the SCROLL_UP/SCROLL_DOWN that would bounce the mode back. This
 * is causal (the baseline follows the state, not the clock) rather than a
 * race against a fixed lock-out window like a timer would be.
 */
let lastScrollY = 0;
let scrollTicking = false;
function onScroll(): void {
  if (typeof window === 'undefined' || scrollTicking) { return; }
  scrollTicking = true;
  window.requestAnimationFrame(() => {
    const y = window.scrollY;
    scrollTicking = false;
    const delta = y - lastScrollY;
    if (Math.abs(delta) >= SCROLL_INTENT_THRESHOLD_PX) {
      sendToc({ 'type': delta > 0 ? 'SCROLL_DOWN' : 'SCROLL_UP' });
      lastScrollY = y;
    }
  });
}

/** THE re-baseline rule that replaces the old time-lockout: on every mode transition, snap the scroll-direction baseline to the post-transition scrollY, so the transition's own reflow is measured against itself (see onScroll's doc comment) instead of against a stale pre-transition position. */
watch(() => tocState.value.variant, () => {
  if (typeof window !== 'undefined') { lastScrollY = window.scrollY; }
});

/** Row 1's item set for the CURRENT display mode — every visible stage when expanded, only the active one when compact. */
const stageRowTargets = computed(() => (compact.value
  ? visibleStageTargets.value.filter((target) => target.id === activeStageId.value)
  : visibleStageTargets.value));

/** Publishes the bar's real measured height (padding + border included, so `contentRect` — which excludes both — isn't good enough) as `--toc-height`, read by `.toc-scroll-target`'s `scroll-margin-top` (main.css / index.vue) so a jump target is never left hidden under the bar, at any of its expanded/compact/mobile heights. */
const barRef = ref<HTMLElement | null>(null);
const heightObserver = useDebouncedResizeObserver((entries) => {
  const target = entries[entries.length - 1]?.target;
  if (target instanceof HTMLElement && typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--toc-height', `${Math.ceil(target.offsetHeight)}px`);
  }
}, 100);

onMounted(() => {
  nextTick(() => setupStageObserver());
  setupHeroObserver();
  if (barRef.value) { heightObserver.observe(barRef.value); }
  lastScrollY = window.scrollY;
  window.addEventListener('scroll', onScroll, { 'passive': true });
});

watch(visibleStageTargets, () => { nextTick(() => setupStageObserver()); });

onBeforeUnmount(() => {
  teardownStageObserver();
  heroObserver?.disconnect();
  heightObserver.disconnect();
  window.removeEventListener('scroll', onScroll);
});
</script>

<template>
  <nav
    ref="barRef"
    class="toc-bar"
    :class="{ 'toc-bar-compact': compact, 'toc-bar-sticky': pastHero }"
    aria-label="Jump to section"
  >
    <div class="toc-inner w-full max-w-6xl mx-auto">
      <!-- Row 1, `lg` and up: balanced multi-row wrap, primary weight. -->
      <div class="toc-row-1 toc-row-1-desktop">
        <BalancedWrap
          :items="stageRowTargets"
          :min-width="110"
          :gap="10"
        >
          <template #default="{ item }">
            <UButton
              :label="item.label"
              :color="item.id === activeStageId ? 'primary' : 'neutral'"
              :variant="item.id === activeStageId ? 'solid' : 'soft'"
              :size="compact ? 'sm' : 'md'"
              class="toc-pill toc-pill-stage font-display rounded-full"
              :aria-current="item.id === activeStageId ? 'true' : undefined"
              @click="select(item.id)"
            />
          </template>
        </BalancedWrap>
      </div>

      <!-- Row 1, below `lg`: single-row horizontal-scroll chip strip — stage-level only, so the hero stays reachable in the first mobile viewport. -->
      <div
        class="toc-row-1 toc-row-1-mobile"
        role="group"
        aria-label="Stages"
      >
        <UButton
          v-for="target in stageRowTargets"
          :key="target.id"
          :label="target.label"
          :color="target.id === activeStageId ? 'primary' : 'neutral'"
          :variant="target.id === activeStageId ? 'solid' : 'soft'"
          size="sm"
          class="toc-pill toc-pill-stage font-display rounded-full shrink-0"
          :aria-current="target.id === activeStageId ? 'true' : undefined"
          @click="select(target.id)"
        />
      </div>

      <!-- Row 2: the in-view stage's own cards, secondary/dimmer — hidden while compact and below `lg`. -->
      <div
        v-if="!compact && activeStageCardTargets.length > 1"
        class="toc-row-2"
        role="group"
        aria-label="Sections in current stage"
      >
        <BalancedWrap
          :items="activeStageCardTargets"
          :min-width="90"
          :gap="6"
        >
          <template #default="{ item }">
            <UButton
              :label="item.label"
              color="neutral"
              variant="ghost"
              size="xs"
              class="toc-pill toc-pill-card font-display rounded-full"
              @click="select(item.id)"
            />
          </template>
        </BalancedWrap>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.toc-bar {
  position: static;
  z-index: 60;
  padding: 0.75rem 1rem;
  background: color-mix(in oklch, var(--ui-bg) 78%, transparent);
  backdrop-filter: blur(10px) saturate(1.15);
  border-bottom: 1px solid color-mix(in oklch, var(--ui-primary) 18%, transparent);
  transition: padding 0.2s ease;
}
/* Only becomes sticky once scrolled past the hero (see `pastHero` /
   `#toc-hero-sentinel`) — before that it sits in normal flow so it never
   steals the first mobile viewport from the hero (NAV-1). */
.toc-bar-sticky {
  position: sticky;
  top: 0;
}
.toc-bar-compact {
  padding: 0.4rem 1rem;
}
.toc-inner {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.toc-bar-compact .toc-inner {
  gap: 0;
}
.toc-row-1-desktop { display: none; }
.toc-row-1-mobile {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  flex-wrap: nowrap;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  padding-block-end: 2px;
}
@media (min-width: 1024px) {
  .toc-row-1-desktop { display: block; }
  .toc-row-1-mobile { display: none; }
}
.toc-row-2 { width: 100%; }
.toc-pill {
  white-space: nowrap;
  scroll-snap-align: start;
}
.toc-pill-stage {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding-inline: 1.1rem;
}
/* Row 2 cards read as secondary/dimmer, never competing with Row 1's
   persistent-filled "you are here" chip (NAV-9) — the AA-gated dimmed text
   token, never a raw neutral-scale shade. */
.toc-pill-card {
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ui-text-dimmed);
}
</style>
